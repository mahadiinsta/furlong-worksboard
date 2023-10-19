import React, { useEffect, useState } from "react";
import "@mobiscroll/react/dist/css/mobiscroll.min.css";
import { Eventcalendar, Draggable, toast, Popup } from "@mobiscroll/react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Card,
	Grid,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import moment from "moment";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { handleDelete, handleUpdate, sortDates } from "./helpingFunctions";
import dayjs from "dayjs";
import ExcludeDates from "./ExcludeDates";
import DeleteDialog from "./DeleteDialog";

const ZOHO = window.ZOHO;

// Create a TaskAccordion component
function TaskAccordion({ tasks, title }) {
	return (
		tasks.length > 0 && (
			<Accordion>
				<AccordionSummary
					expandIcon={<ExpandMoreIcon />}
					aria-controls="panel1a-content"
					id="panel1a-header"
				>
					<Typography>{title}</Typography>
				</AccordionSummary>
				<AccordionDetails>
					{tasks.map((task, i) => (
						<Task key={i} data={task} />
					))}
				</AccordionDetails>
			</Accordion>
		)
	);
}

function Calendar({ contractors, events, projects, inProgress }) {
	const [start__Date, setStartDate] = useState(null);
	const [end__Date, setEndDate] = useState(null);
	const [excluded, setExcluded] = useState([]);
	const [eventSelected, setEventSelected] = useState(false);
	// const [myEvents, setMyEvents] = useState([])
	const view = React.useMemo(() => {
		return {
			timeline: {
				type: "month",
				rowHeight: "equal",
				eventCreation: "false",
			},
		};
	}, []);

	const myResources = [];
	const myEvents = [];
	const tasks = [];

	if (contractors.length > 0) {
		contractors.forEach((contractor) => {
			myResources.push({
				id: contractor?.id,
				name: contractor.First_Name + " " + contractor.Last_Name,
				// test: "test"
			});
		});
	}

	if (events.length > 0) {
		events.forEach((event) => {
			if (event.Projects !== null) {
				myEvents.push({
					start: event.Start_Date,
					end: moment(event.End_Date).format("YYYY-MM-DD"),
					title: event.Projects.name,
					resource: event?.Contractor?.id,
					event_id: event?.id,
					color: event.Color_Code,
					project_id: event?.Projects?.id,
					Project_Summary: event.Project_Summary,
					estimated_time_budget: event.Current_Estimated_Time_Budget,
					Excluded_Dates: event.Excluded_Dates,
				});
			}
		});
	}

	let myEventsWithExclusions = [];

	// myEvents.forEach((event) => {
	//   if (event.Excluded_Dates) {
	//     const excludedDates = event.Excluded_Dates.split(",").map((dateStr) => {
	//       return moment(dateStr, "YYYY-MM-DD").format("YYYY-MM-DD"); // Parse the excluded dates using the specified format
	//     });

	//     const sortedDates = sortDates(excludedDates);

	//     // console.log({ sortedDates });

	//     let startDate = moment(event.start);
	//     const endDate = moment(event.end);

	//     // Initialize an array to store the dates
	//     const datePairs = [];

	//     let currentPair = null;

	//     for (
	//       let date = startDate.clone();
	//       date.isSameOrBefore(endDate);
	//       date.add(1, "days")
	//     ) {
	//       const formattedDate = date.format("YYYY-MM-DD");

	//       if (excludedDates.includes(formattedDate)) {
	//         if (currentPair) {
	//           datePairs.push(currentPair);
	//           currentPair = null;
	//         }
	//       } else {
	//         if (!currentPair) {
	//           currentPair = {
	//             start: formattedDate,
	//             end: event.end,
	//             title: event.title,
	//             resource: event?.resource,
	//             event_id: event?.event_id,
	//             color: event.color,
	//             project_id: event?.project_id,
	//             Project_Summary: event.Project_Summary,
	//             estimated_time_budget: event.estimated_time_budget,
	//             Excluded_Dates: event.Excluded_Dates,
	//           };
	//         } else {
	//           currentPair.end = moment(formattedDate)
	//             .add(1, "days")
	//             .format("YYYY-MM-DD");
	//         }
	//       }
	//     }

	//     if (currentPair) {
	//       datePairs.push(currentPair);
	//     }

	//     // Remove empty objects
	//     const filteredDatePairs = datePairs.filter((pair) => pair !== null);

	//     myEventsWithExclusions = [
	//       ...myEventsWithExclusions,
	//       ...filteredDatePairs,
	//     ];
	//   } else {
	//     event.end = moment(event.end).add(1, "days").format("YYYY-MM-DD");
	//     myEventsWithExclusions.push(event);
	//   }
	// });

	/* ------------------ Fahims Task --------------- */

	const onEventCreate = React.useCallback(async (event) => {
		const start_date = moment(event.event.start.toString());
		const end_date = moment(event.event.end.toString());

		const days_in_between = end_date.diff(start_date, "days");

		const recordData = {
			Start_Date: start_date.format("YYYY-MM-DD"),
			End_Date: end_date.format("YYYY-MM-DD"),
			Projects: { id: event.event.project_id },
			Contractor: { id: event.event.resource },
			Project_Name: event.event.title,
		};

		console.log({ recordData: recordData, days_in_between: days_in_between });
		await ZOHO.CRM.API.insertRecord({
			Entity: "Job_Allocations",
			APIData: recordData,
			Trigger: ["workflow"],
		}).then(function (data) {
			if (data.data[0].status === "success") {
				toast({
					message: "Project Allocated Successfully",
				});

				const attendenceData = {
					Name: event.event.title,
					Attendance_Confirmation: "Scheduled",
					Attendance_Date: start_date.format("YYYY-MM-DD"),
					Scheduling: { id: data.data[0].details.id },
				};
				ZOHO.CRM.API.insertRecord({
					Entity: "Project_Attendance",
					APIData: attendenceData,
					Trigger: ["workflow"],
				}).then(function (data) {
					console.log({ inserted: data });
				});
				// const config = {
				//   Entity: "FP_Projects",
				//   APIData: {
				//     id: event.event.project_id,
				//     Job_Offer_Status: "Allocated",
				//   },
				//   Trigger: ["workflow"],
				// };
				// ZOHO.CRM.API.updateRecord(config).then(function (data) {
				//   console.log(data);
				// });

				// window.location.reload(false);
			} else {
				toast({
					message: "There is something wrong",
				});
			}
		});
	}, []);

	const now = new Date();

	const activeProjects = [];

	const as_soon_as_possible = [];
	const urgent = [];
	const term_1_holiday = [];
	const term_2_holiday = [];
	const term_3_holiday = [];
	const term_4_holiday = [];
	const specific_dates_provided = [];
	const weekend_works = [];

	function createTask(project, color) {
		return {
			title: project.Account_name,
			color,
			project_id: project.id,
			work_summary: project.Work_Summary_Sale,
			estimated_time_budget: project.Budget_time_Add_Remove,
			Project_Timing: project.Project_Timing,
			start: moment(now).format("YYYY-MM-DD"),
			end: moment(now).format("YYYY-MM-DD"),
		};
	}

	const timingToTasksMap = {
		Urgent: urgent,
		"As soon as possible": as_soon_as_possible,
		"Term 1 School holidays": term_1_holiday,
		"Term 2 School holidays": term_2_holiday,
		"Term 3 School holidays": term_3_holiday,
		"Term 4 School holidays": term_4_holiday,
		"Specific dates provided": specific_dates_provided,
		"Weekend works": weekend_works,
	};

	if (projects.length > 0) {
		projects.forEach((project) => {
			const projectTiming = project.Project_Timing;
			if (timingToTasksMap.hasOwnProperty(projectTiming)) {
				const task = createTask(project, "gray");
				timingToTasksMap[projectTiming].push(task);
			}
		});
	}

	const taskTypes = [
		{ tasks: urgent, title: "Urgent" },
		{ tasks: as_soon_as_possible, title: "As soon as possible" },
		{ tasks: term_1_holiday, title: "Term 1 Holiday" },
		{ tasks: term_2_holiday, title: "Term 2 Holiday" },
		{ tasks: term_3_holiday, title: "Term 3 Holiday" },
		{ tasks: term_4_holiday, title: "Term 4 Holiday" },
		{ tasks: specific_dates_provided, title: "Specific Dates Provided" },
		{ tasks: weekend_works, title: "Weekend Works" },
	];

	if (inProgress.length > 0) {
		inProgress.forEach((project) => {
			activeProjects.push(createTask(project, "#C4F0B3"));
		});
	}

	/* ------------------Fahims Task--------------- */

	const onEventUpdated = React.useCallback(async (args) => {
		// here you can update the event in your storage as well, after drag & drop or resize
		const changedEvent = args.event;
		const event_id = changedEvent.event_id;
		const start = moment(changedEvent.start.toString()).format("YYYY-MM-DD");
		const end = moment(changedEvent.end.toString()).format("YYYY-MM-DD");

		let dateArray = dateRange(start, end);
		let diffDates = dateArray[1];
		let updatedDates = dateArray[0];
		console.log({ diffDates }, { updatedDates });

		// console.log({ event_id });

		var config = {
			Entity: "Job_Allocations",
			APIData: {
				id: changedEvent.event_id,
				Start_Date: moment(changedEvent.start.toString()).format("YYYY-MM-DD"),
				End_Date: moment(changedEvent.end.toString()).format("YYYY-MM-DD"),
				Contractor: { id: changedEvent.resource },
			},
			Trigger: ["workflow"],
		};
		let project_Name=''

		ZOHO.CRM.API.getRelatedRecords({
			Entity: "Job_Allocations",
			RecordID: event_id,
			RelatedList: "Attendance_Log",
			page: 1,
			per_page: 200,
		}).then(function (data) {
			console.log({ RelatedRec: data.data });
			if (data.data.length === 1) {
				ZOHO.CRM.API.updateRecord(config).then(function (data) {
					let ID = 0;
					if (data.data[0].status === "success") {
						toast({
							message: "Project Allocation Updated Successfully",
						});

						const startDate = moment(changedEvent.start.toString());
						const endDate = moment(changedEvent.end.toString());
						console.log(startDate, endDate);
						const daysBetween = endDate.diff(startDate, "days");
						ID = data.data[0].details.id;
						console.log({ daysBetween });

						ZOHO.CRM.API.getRecord({
							Entity: "Job_Allocations",
							approved: "both",
							RecordID: ID,
						}).then(function (data) {
							///creating attendence for everyday////
							let currentDate = startDate.clone();
							project_Name=  data.data[0].Project_Name
							for (let i = 0; i < daysBetween - 1; i++) {
								let attendenceData = {
									Name: data.data[0].Project_Name,
									Attendance_Confirmation: "Scheduled",
									Attendance_Date: currentDate
										.add(1, "days")
										.format("YYYY-MM-DD"),
									Scheduling: { id: ID },
								};
								ZOHO.CRM.API.insertRecord({
									Entity: "Project_Attendance",
									APIData: attendenceData,
									Trigger: ["workflow"],
								});
							}
						});
					} else {
						toast({
							message: "There is something wrong",
						});
					}
				});
			}else if (data.data.length > 1 && data.data.length<diffDates ) {
				const tempDateArr=[];
				data.data.map((item)=>{
					tempDateArr.push(item.Attendance_Date)	
				})
				const newDates = updatedDates.filter(
					(item) => !tempDateArr.includes(item)
				);
				ZOHO.CRM.API.updateRecord(config).then(function (data) {
					let ID = 0;
					if (data.data[0].status === "success") {
						toast({
							message: "Project Allocation Updated Successfully",
						});	
						ID = data.data[0].details.id;
						// console.log(data.data[0])
						ZOHO.CRM.API.getRecord({
							Entity: "Job_Allocations",
							approved: "both",
							RecordID: ID,
						}).then(function (data) {
							newDates.map((item)=>{
								let attendenceData = {
									Name: data.data[0].Project_Name,
									Attendance_Confirmation: "Scheduled",
									Attendance_Date: item,
									Scheduling: { id: ID },
								};
								ZOHO.CRM.API.insertRecord({
									Entity: "Project_Attendance",
									APIData: attendenceData,
									Trigger: ["workflow"],
								}).then(d =>
									console.log(d))
							})
						})
						
						
					} else {
						toast({
							message: "There is something wrong",
						});
					}
				});
				
			} else {
				ZOHO.CRM.API.updateRecord(config).then(function (data) {
					let ID = 0;
					if (data.data[0].status === "success") {
						toast({
							message: "Project Allocation Updated Successfully",
						});	
					} else {
						toast({
							message: "There is something wrong",
						});
					}
				});
				const newDates = data.data.filter(
					(item) => !updatedDates.includes(item.Attendance_Date)
				);
				newDates.map((item) => {
					console.log(item.id);
					
					ZOHO.CRM.API.deleteRecord({
						Entity: "Project_Attendance",
						RecordID: item.id,
					}).then(function (data) {
						console.log(data);
					});
				});
			}
		});
		// await ZOHO.CRM.API.updateRecord(config).then(function (data) {
		// 	let ID =0;
		// 	if (data.data[0].status === "success") {
		// 		toast({
		// 			message: "Project Allocation Updated Successfully",
		// 		});

		// 		const startDate = moment(changedEvent.start.toString());
		// 		const endDate = moment(changedEvent.end.toString());
		// 		console.log(startDate, endDate);
		// 		const daysBetween = endDate.diff(startDate, "days");
		// 		 ID = data.data[0].details.id;
		// 		console.log({ daysBetween });

		// 		ZOHO.CRM.API.getRecord({
		// 			Entity: "Job_Allocations",
		// 			approved: "both",
		// 			RecordID: ID,
		// 		}).then(function (data) {
		// 			///creating attendence for everyday////
		// 			let currentDate = startDate.clone();

		// 			for (let i = 0; i < daysBetween-1; i++) {
		// 				let attendenceData = {
		// 					Name: data.data[0].Project_Name,
		// 					Attendance_Confirmation: "Scheduled",
		// 					Attendance_Date: currentDate.add(1, 'days').format("YYYY-MM-DD"),
		// 					Scheduling: { id: ID },
		// 				};
		// 				ZOHO.CRM.API.insertRecord({
		// 					Entity: "Project_Attendance",
		// 					APIData: attendenceData,
		// 					Trigger: ["workflow"],
		// 				});
		// 			}

		// 			// console.log(data);
		// 		});
		// 		// console.log({updatedData:data});
		// 	} else {
		// 		toast({
		// 			message: "There is something wrong",
		// 		});
		// 	}
		// });
		// ...
	}, []);

	const myInvalids = React.useMemo(() => {
		return [
			{
				recurring: {
					repeat: "weekly",
					weekDays: "SA,SU",
				},
			},
		];
	}, []);

	const desiredOrder = [
		"Donny Georgopoulos",
		"Troy Kennedy",
		"Christine Rogers",
		"William Hunter",
		"John Eghdame",
		"Farhad Baleshzar",
		"Michael Icaro",
		"Muhummad Ashraf",
		"Keith Higgins",
		"Jobanpreet Singh",
		"Andy Joseph",
		"Parimal Patel",
	];

	// define the custom sorting function

	const sortedArray = desiredOrder.map((name) =>
		myResources.find((obj) => obj.name === name)
	);

	const unsortedArray = myResources.filter(
		(item) => !desiredOrder.includes(item.name)
	);

	const sortedResources = [...sortedArray, ...unsortedArray];

	const [isOpen, setOpen] = React.useState(false);
	const [anchor, setAnchor] = React.useState(null);
	const timerRef = React.useRef(null);
	const [popupdata, setPopupData] = React.useState(null);

	const onEventHoverIn = React.useCallback(
		(args) => {
			setEventSelected(true);
			let tempEvent = args.event;

			const foundevent = myEvents.filter(
				(event) => event.event_id === tempEvent.event_id
			)[0];

			if (foundevent !== undefined) {
				// const result = activeProjects.find(
				//   (project) => foundevent.project_id === project.project_id);

				let excludedDate = [];

				if (foundevent.Excluded_Dates !== null) {
					const excludedDates = foundevent.Excluded_Dates.split(",").map(
						(dateStr) => {
							return moment(dateStr, "YYYY-MM-DD").format("YYYY-MM-DD"); // Parse the excluded dates using the specified format
						}
					);
					excludedDate = excludedDates;
				}
				console.log({ excludedDate });
				setExcluded(excludedDate);
				setStartDate(moment(foundevent?.start));
				setEndDate(moment(foundevent?.end));
				setPopupData(foundevent);
			}

			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			setAnchor(args.domEvent.target);
			setOpen(true);
		},
		[myEvents]
	);

	const onEventHoverOut = React.useCallback(() => {
		timerRef.current = setTimeout(() => {
			setOpen(false);
		}, 200);
	}, []);

	const onMouseEnter = React.useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
	}, []);

	const onMouseLeave = React.useCallback(() => {
		timerRef.current = setTimeout(() => {
			setOpen(false);
		}, 200);
	}, []);

	//Excluded days looping
	let days = [];

	function dateRange(startDate, endDate, steps = 1) {
		const dateArray = [];
		const start = moment(startDate);
		const end = moment(endDate);
		const currentDate = start.clone();
		const daysBetween = end.diff(start, "days");
		for (let i = 0; i < daysBetween; i++) {
			dateArray.push(currentDate.format("YYYY-MM-DD"));
			currentDate.add(1, "days");
		}
		return [dateArray, daysBetween];
	}

	start__Date !== null &&
		end__Date !== null &&
		(days = dateRange(start__Date, end__Date));

	// console.log({myEventsWithExclusions})

	const [deleteDialog, setDeleteDialog] = React.useState(false);

	const handleClickOpen = () => {
		setDeleteDialog(true);
	};

	const handleClose = (value) => {
		setDeleteDialog(false);
	};

	return (
		<Box sx={{ height: "100vh", overflowY: "hidden", bgcolor: "#f8f8f8" }}>
			<Grid container>
				<Grid xs={9} sx={{ padding: "10px" }}>
					<Eventcalendar
						themeVariant="light"
						view={{
							timeline: {
								type: "day",
								size: 15,
								resolutionHorizontal: "day",
								eventList: true,
							},
						}}
						invalid={myInvalids}
						data={myEvents}
						resources={myResources}
						dragToMove={true}
						externalDrop={true}
						eventOverlap={false}
						onEventCreate={onEventCreate}
						dragToResize={true}
						onEventUpdated={onEventUpdated}
						clickToCreate={false}
						dragToCreate={false}
						showEventTooltip={false}
						// onEventHoverIn={onEventHoverIn}
						onEventClick={onEventHoverIn}
						// onEventHoverOut={onEventHoverOut}
					/>
				</Grid>
				<Grid
					xs={3}
					sx={{
						height: "100vh",
						overflowY: "scroll",
					}}
				>
					{eventSelected && (
						<Box sx={{ padding: "10px" }}>
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography
									variant="h5"
									align="center"
									sx={{ padding: "20px 0px", fontWeight: "bold" }}
								>
									Update Job Allocation
								</Typography>
								<Button onClick={() => setEventSelected(false)}> Cancel</Button>
							</Box>
							<Box sx={{ display: "flex" }}>
								<p className="input-label">Event Name: </p>
								<p>{popupdata.title}</p>
							</Box>
							<Box sx={{ display: "flex" }}>
								<label className="input-label">Start Date</label>
								<LocalizationProvider dateAdapter={AdapterMoment}>
									<DatePicker
										label="Select Start Date"
										value={start__Date}
										onChange={(newValue) => {
											setStartDate(newValue);
										}}
										renderInput={(params) => <TextField {...params} />}
									/>
								</LocalizationProvider>
							</Box>
							<br />
							<Box sx={{ display: "flex" }}>
								<label className="input-label">End Date</label>
								<LocalizationProvider dateAdapter={AdapterMoment}>
									<DatePicker
										label="Select End Date"
										value={end__Date}
										onChange={(newValue) => {
											setEndDate(newValue);
										}}
										renderInput={(params) => <TextField {...params} />}
									/>
								</LocalizationProvider>
							</Box>
							<br />
							<br />
							<ExcludeDates
								days={days}
								setExcluded={setExcluded}
								excluded={excluded}
							/>
							<br />
							<br />
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Button
									variant="contained"
									onClick={() =>
										handleUpdate(
											start__Date,
											end__Date,
											excluded,
											popupdata,
											ZOHO
										)
									}
								>
									Update
								</Button>
								<Button
									variant="contained"
									color="error"
									onClick={handleClickOpen}
								>
									Delete
								</Button>
							</Box>
						</Box>
					)}
					{!eventSelected && (
						<Box sx={{ padding: "10px 0px" }}>
							<Typography
								variant="h5"
								align="center"
								sx={{ padding: "20px 0px" }}
							>
								Available Projects
							</Typography>
							{taskTypes.map((taskType, index) => (
								<TaskAccordion
									key={index}
									tasks={taskType.tasks}
									title={taskType.title}
								/>
							))}
						</Box>
					)}
					{!eventSelected && (
						<div>
							<Typography
								sx={{ margin: "10px 0px" }}
								align="center"
								variant="h5"
							>
								In Progress
							</Typography>
							<div>
								{activeProjects.map((task, i) => (
									<Task key={i} data={task} />
								))}
							</div>
						</div>
					)}
				</Grid>
			</Grid>
			<DeleteDialog
				deleteDialog={deleteDialog}
				handleClose={handleClose}
				deleteData={popupdata}
				ZOHO={ZOHO}
			/>
			{/* <div style={{ display: "flex", height: "95vh" }}>
        <Popup
          // display="anchored"
          isOpen={isOpen}
          anchor={anchor}
          touchUi={false}
          showOverlay={false}
          contentPadding={false}
          closeOnOverlayClick={false}
          width={600}
          cssClass="md-tooltip"
        >
          <Card onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className="md-tooltip-info">
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <CloseIcon
                  sx={{ cursor: "pointer" }}
                  onClick={() => setOpen(false)}
                />
              </div>
              <Box sx={{ display: "flex" }}>
                <label className="input-label">Start Date</label>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    label="Select Start Date"
                    value={start__Date}
                    onChange={(newValue) => {
                      setStartDate(newValue);
                    }}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </LocalizationProvider>
              </Box>
              <br />
              <Box sx={{ display: "flex" }}>
                <label className="input-label">End Date</label>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    label="Select End Date"
                    value={end__Date}
                    onChange={(newValue) => {
                      setEndDate(newValue);
                    }}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </LocalizationProvider>
              </Box>
              <br />
              <ExcludeDates days={days} setExcluded={setExcluded} />
              <br />
              <br />
            </div>
          </Card>
        </Popup>
      </div> */}
		</Box>
	);
}

export default Calendar;

function Task(props) {
	const [draggable, setDraggable] = React.useState();

	const setDragElm = React.useCallback((elm) => {
		// console.log({ elm });
		setDraggable(elm);
	}, []);

	return (
		<div
			ref={setDragElm}
			style={{ background: props.data.color }}
			className="external-event-task"
		>
			<Tooltip title={`${props.data.work_summary}`} placement="left-start">
				<Button
					sx={{
						textTransform: "none",
						padding: 0,
						color: "#000",
					}}
				>
					{props.data.title +
						": CET - " +
						`${props.data.estimated_time_budget || "(n/a)"}`}
				</Button>
			</Tooltip>
			<Draggable dragData={props.data} element={draggable} />
		</div>
	);
}
