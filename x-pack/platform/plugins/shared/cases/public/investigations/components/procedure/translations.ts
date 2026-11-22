/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.cases.investigations.procedure.title', {
  defaultMessage: 'Procedure',
});
export const LOADING = i18n.translate('xpack.cases.investigations.procedure.loading', {
  defaultMessage: 'Loading the procedure',
});
export const LOAD_ERROR = i18n.translate('xpack.cases.investigations.procedure.loadError', {
  defaultMessage: 'The procedure could not be loaded',
});
export const CONFIGURE = i18n.translate('xpack.cases.investigations.procedure.configure', {
  defaultMessage: 'Edit task list',
});
export const TYPE_NOT_SET = i18n.translate('xpack.cases.investigations.procedure.typeNotSet', {
  defaultMessage: 'No template set',
});
export const PROGRESS_LABEL = i18n.translate('xpack.cases.investigations.procedure.progressLabel', {
  defaultMessage: 'Procedure progress',
});
export const DONE_OF_TOTAL = (done: number, total: number) =>
  i18n.translate('xpack.cases.investigations.procedure.doneOfTotal', {
    defaultMessage: '{done} of {total} done',
    values: { done, total },
  });
export const OVERDUE_COUNT = (count: number) =>
  i18n.translate('xpack.cases.investigations.procedure.overdueCount', {
    defaultMessage: '{count} overdue',
    values: { count },
  });
export const REQUIRED_LEFT = (count: number) =>
  i18n.translate('xpack.cases.investigations.procedure.requiredLeft', {
    defaultMessage:
      '{count, plural, one {# required task} other {# required tasks}} before you can close',
    values: { count },
  });
export const ALL_REQUIRED_DONE = i18n.translate(
  'xpack.cases.investigations.procedure.allRequiredDone',
  { defaultMessage: 'All required tasks are done' }
);
export const HEADER_NOTE = (type: string) =>
  i18n.translate('xpack.cases.investigations.procedure.headerNote', {
    defaultMessage:
      'The {type} task list sets these tasks. Claims and approved actions complete their tasks automatically, and each completion names who or what did it. Change the template with Take action, Change template.',
    values: { type },
  });
export const CLOSE_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.procedure.closeInvestigation',
  { defaultMessage: 'Close investigation' }
);
export const CLOSED = i18n.translate('xpack.cases.investigations.procedure.closed', {
  defaultMessage: 'Closed',
});
export const MAX_TASKS_REACHED = (max: number) =>
  i18n.translate('xpack.cases.investigations.procedure.maxTasksReached', {
    defaultMessage: 'You have reached the maximum of {max} tasks.',
    values: { max },
  });

/* Filters */
export const FILTER_LABEL = i18n.translate('xpack.cases.investigations.procedure.filterLabel', {
  defaultMessage: 'Task filter',
});
export const FILTER_ALL = (count: number) =>
  i18n.translate('xpack.cases.investigations.procedure.filterAll', {
    defaultMessage: 'All {count}',
    values: { count },
  });
export const FILTER_MINE = (count: number) =>
  i18n.translate('xpack.cases.investigations.procedure.filterMine', {
    defaultMessage: 'Mine {count}',
    values: { count },
  });
export const FILTER_OPEN = (count: number) =>
  i18n.translate('xpack.cases.investigations.procedure.filterOpen', {
    defaultMessage: 'Open {count}',
    values: { count },
  });
export const FILTER_REQUIRED = (count: number) =>
  i18n.translate('xpack.cases.investigations.procedure.filterRequired', {
    defaultMessage: 'Required {count}',
    values: { count },
  });
export const OWNER_FILTER_LABEL = i18n.translate(
  'xpack.cases.investigations.procedure.ownerFilterLabel',
  { defaultMessage: 'Filter by owner type' }
);
export const OWNER_FILTER_ALL = i18n.translate(
  'xpack.cases.investigations.procedure.ownerFilterAll',
  { defaultMessage: 'Any owner' }
);
export const NO_TASKS_MATCH = i18n.translate('xpack.cases.investigations.procedure.noTasksMatch', {
  defaultMessage: 'No tasks match this filter.',
});
export const REORDER_NEEDS_ALL = i18n.translate(
  'xpack.cases.investigations.procedure.reorderNeedsAll',
  { defaultMessage: 'Show all tasks to drag them into a new order.' }
);

/* Phases and rows */
export const PHASE_COUNT = (done: number, total: number) =>
  i18n.translate('xpack.cases.investigations.procedure.phaseCount', {
    defaultMessage: '{done}/{total}',
    values: { done, total },
  });
export const REQUIRED = i18n.translate('xpack.cases.investigations.procedure.required', {
  defaultMessage: 'Required',
});
export const STATUS_IN_PROGRESS = i18n.translate(
  'xpack.cases.investigations.procedure.statusInProgress',
  { defaultMessage: 'In progress' }
);
export const STATUS_CANCELLED = i18n.translate(
  'xpack.cases.investigations.procedure.statusCancelled',
  { defaultMessage: 'Cancelled' }
);
export const STATUS_WAITING = i18n.translate('xpack.cases.investigations.procedure.statusWaiting', {
  defaultMessage: 'Waiting',
});
export const STATUS_BLOCKED = i18n.translate('xpack.cases.investigations.procedure.statusBlocked', {
  defaultMessage: 'Blocked',
});
export const OWNER_PERSON = i18n.translate('xpack.cases.investigations.procedure.ownerPerson', {
  defaultMessage: 'Person',
});
export const OWNER_TEAM = i18n.translate('xpack.cases.investigations.procedure.ownerTeam', {
  defaultMessage: 'Team',
});
export const OWNER_AGENT = i18n.translate('xpack.cases.investigations.procedure.ownerAgent', {
  defaultMessage: 'Agent',
});
export const OWNER_AUTOMATION = i18n.translate(
  'xpack.cases.investigations.procedure.ownerAutomation',
  { defaultMessage: 'Automation' }
);
export const UNASSIGNED = i18n.translate('xpack.cases.investigations.procedure.unassigned', {
  defaultMessage: 'Unassigned',
});
export const MORE_ASSIGNEES = (count: number) =>
  i18n.translate('xpack.cases.investigations.procedure.moreAssignees', {
    defaultMessage: '+{count}',
    values: { count },
  });
export const AFTER = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.after', {
    defaultMessage: 'After: {title}',
    values: { title },
  });
export const WAITS_FOR = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.waitsFor', {
    defaultMessage: 'Waits for "{title}".',
    values: { title },
  });
export const FINISH_FIRST = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.finishFirst', {
    defaultMessage: 'Finish "{title}" first.',
    values: { title },
  });
export const BLOCKED_BECAUSE = (ref: string) =>
  i18n.translate('xpack.cases.investigations.procedure.blockedBecause', {
    defaultMessage: 'Blocked because {ref} is blocked.',
    values: { ref },
  });
export const COMPLETES_WHEN_SETTLED = (ref: string) =>
  i18n.translate('xpack.cases.investigations.procedure.completesWhenSettled', {
    defaultMessage: 'Completes when {ref} is settled',
    values: { ref },
  });
export const COMPLETES_WHEN_CLAIM_SETTLED = i18n.translate(
  'xpack.cases.investigations.procedure.completesWhenClaimSettled',
  { defaultMessage: 'Completes when its claim is settled' }
);
export const COMPLETES_WHEN_ACTION = (category: string) =>
  i18n.translate('xpack.cases.investigations.procedure.completesWhenAction', {
    defaultMessage: 'Completes when a {category} action is approved',
    values: { category },
  });
export const COMPLETED_BY = (name: string, kind: string) =>
  i18n.translate('xpack.cases.investigations.procedure.completedBy', {
    defaultMessage: 'Completed by {name} ({kind})',
    values: { name, kind },
  });
export const ON_BEHALF_OF = (name: string) =>
  i18n.translate('xpack.cases.investigations.procedure.onBehalfOf', {
    defaultMessage: 'on behalf of {name}',
    values: { name },
  });
export const CANCELLED_NOTE = (reason: string) =>
  i18n.translate('xpack.cases.investigations.procedure.cancelledNote', {
    defaultMessage: 'Cancelled. {reason}',
    values: { reason },
  });
export const CANCELLED_BY = (name: string) =>
  i18n.translate('xpack.cases.investigations.procedure.cancelledBy', {
    defaultMessage: 'Cancelled by {name}',
    values: { name },
  });

/* Row actions */
export const MARK_IN_PROGRESS = i18n.translate(
  'xpack.cases.investigations.procedure.markInProgress',
  { defaultMessage: 'Mark in progress' }
);
export const CANCEL_TASK = i18n.translate('xpack.cases.investigations.procedure.cancelTask', {
  defaultMessage: 'Cancel task',
});
export const REOPEN_TASK = i18n.translate('xpack.cases.investigations.procedure.reopenTask', {
  defaultMessage: 'Reopen task',
});
export const DELETE_TASK = i18n.translate('xpack.cases.investigations.procedure.deleteTask', {
  defaultMessage: 'Delete task',
});
export const ADD_TASK = i18n.translate('xpack.cases.investigations.procedure.addTask', {
  defaultMessage: 'Add task',
});
export const ADD_SUBTASK = i18n.translate('xpack.cases.investigations.procedure.addSubtask', {
  defaultMessage: 'Add sub-task',
});
export const MORE_ACTIONS = i18n.translate('xpack.cases.investigations.procedure.moreActions', {
  defaultMessage: 'More actions',
});
export const MORE_ACTIONS_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.moreActionsAria', {
    defaultMessage: 'More actions for {title}',
    values: { title },
  });
export const MARK_DONE_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.markDoneAria', {
    defaultMessage: 'Mark {title} as done',
    values: { title },
  });
export const REOPEN_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.reopenAria', {
    defaultMessage: 'Reopen {title}',
    values: { title },
  });
export const PRIORITY_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.priorityAria', {
    defaultMessage: 'Change the severity of {title}',
    values: { title },
  });
export const DRAG_TO_REORDER = i18n.translate(
  'xpack.cases.investigations.procedure.dragToReorder',
  {
    defaultMessage: 'Drag to reorder',
  }
);
export const MOVED_ANNOUNCEMENT = (title: string, position: number, total: number) =>
  i18n.translate('xpack.cases.investigations.procedure.movedAnnouncement', {
    defaultMessage: '{title} moved to position {position} of {total}',
    values: { title, position, total },
  });
export const SHOW_COMMENTS = i18n.translate('xpack.cases.investigations.procedure.showComments', {
  defaultMessage: 'Comments',
});
export const HIDE_COMMENTS = i18n.translate('xpack.cases.investigations.procedure.hideComments', {
  defaultMessage: 'Hide comments',
});
export const TASK_COMMENTS_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.investigations.procedure.taskCommentsLimit', {
    defaultMessage: 'A task can have at most {max} comments.',
    values: { max },
  });

/* Due date */
export const NO_DUE_DATE = i18n.translate('xpack.cases.investigations.procedure.noDueDate', {
  defaultMessage: 'No due date',
});
export const DUE_DATE_LABEL = i18n.translate('xpack.cases.investigations.procedure.dueDateLabel', {
  defaultMessage: 'Due date',
});
export const DUE_DATE_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.dueDateAria', {
    defaultMessage: 'Change the due date of {title}',
    values: { title },
  });
export const OVERDUE_SCREEN_READER = i18n.translate(
  'xpack.cases.investigations.procedure.overdueScreenReader',
  { defaultMessage: ' overdue' }
);
export const SAVE_DUE_DATE = i18n.translate('xpack.cases.investigations.procedure.saveDueDate', {
  defaultMessage: 'Set due date',
});
export const CLEAR_DUE_DATE = i18n.translate('xpack.cases.investigations.procedure.clearDueDate', {
  defaultMessage: 'Remove due date',
});

/* Workflow */
export const RUN_WORKFLOW = i18n.translate('xpack.cases.investigations.procedure.runWorkflow', {
  defaultMessage: 'Run',
});
export const RUN_WORKFLOW_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.runWorkflowAria', {
    defaultMessage: 'Run the workflow of {title}',
    values: { title },
  });
export const WORKFLOW_RUNNING = i18n.translate(
  'xpack.cases.investigations.procedure.workflowRunning',
  { defaultMessage: 'Running' }
);
export const WORKFLOW_FAILED = i18n.translate(
  'xpack.cases.investigations.procedure.workflowFailed',
  {
    defaultMessage: 'Workflow failed',
  }
);
export const WORKFLOW_FAILED_NO_ERROR = i18n.translate(
  'xpack.cases.investigations.procedure.workflowFailedNoError',
  { defaultMessage: 'The workflow run failed.' }
);
export const COMPLETES_WHEN_WORKFLOW_SUCCEEDS = i18n.translate(
  'xpack.cases.investigations.procedure.completesWhenWorkflowSucceeds',
  { defaultMessage: 'The task completes when its workflow run succeeds.' }
);
export const WORKFLOWS_UNAVAILABLE_REASON = i18n.translate(
  'xpack.cases.investigations.procedure.workflowsUnavailableReason',
  { defaultMessage: 'Workflows is not available, so the workflow of this task cannot run.' }
);
export const WORKFLOWS_LOADING_REASON = i18n.translate(
  'xpack.cases.investigations.procedure.workflowsLoadingReason',
  { defaultMessage: 'Checking the workflows of this space.' }
);
export const NO_WORKFLOWS_REASON = i18n.translate(
  'xpack.cases.investigations.procedure.noWorkflowsReason',
  { defaultMessage: 'This space has no enabled workflows. Create one in Workflows to run it here.' }
);
export const WORKFLOW_NOT_FOUND_REASON = i18n.translate(
  'xpack.cases.investigations.procedure.workflowNotFoundReason',
  { defaultMessage: 'The workflow of this task was not found or is disabled.' }
);
export const NO_EXECUTE_PRIVILEGE_REASON = i18n.translate(
  'xpack.cases.investigations.procedure.noExecutePrivilegeReason',
  { defaultMessage: 'You need the Workflows execute privilege to run this workflow.' }
);

/* Agent */
export const RUN_WITH_AGENT = i18n.translate('xpack.cases.investigations.procedure.runWithAgent', {
  defaultMessage: 'Run with agent',
});
export const RUNNING_WITH_AGENT = i18n.translate(
  'xpack.cases.investigations.procedure.runningWithAgent',
  { defaultMessage: 'Agent is working' }
);
export const RUN_WITH_AGENT_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.runWithAgentSuccess', {
    defaultMessage: 'The agent finished "{title}"',
    values: { title },
  });
/** The prompt the agent is sent. The agent completes the task with its set-task-status tool. */
export const AGENT_RUN_PROMPT = (ref: string) => `Mark task ${ref} done`;
export const RUN_WITH_AGENT_ERROR = i18n.translate(
  'xpack.cases.investigations.procedure.runWithAgentError',
  { defaultMessage: 'The agent could not run this task' }
);

/* Cancel and delete */
export const CANCEL = i18n.translate('xpack.cases.investigations.procedure.cancel', {
  defaultMessage: 'Cancel',
});
export const KEEP_TASK = i18n.translate('xpack.cases.investigations.procedure.keepTask', {
  defaultMessage: 'Keep task',
});
export const CANCEL_REQUIRED_NOTE = i18n.translate(
  'xpack.cases.investigations.procedure.cancelRequiredNote',
  { defaultMessage: 'This task is required to close. Explain why it was cancelled.' }
);
export const CANCEL_REASON_LABEL = i18n.translate(
  'xpack.cases.investigations.procedure.cancelReasonLabel',
  { defaultMessage: 'Reason' }
);
export const CANCEL_REASON_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.procedure.cancelReasonPlaceholder',
  { defaultMessage: 'Example: No mailboxes were involved.' }
);
export const CANCEL_REASON_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.cancelReasonRequired',
  { defaultMessage: 'Give a reason so the record explains the gap.' }
);
export const CANCEL_REASON_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.procedure.cancelReasonTooLong',
  { defaultMessage: 'Use 2,048 characters or fewer.' }
);
export const CANCEL_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.cancelSuccess', {
    defaultMessage: 'Cancelled "{title}".',
    values: { title },
  });
export const DELETE_TASK_TITLE = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.deleteTaskTitle', {
    defaultMessage: 'Delete task "{title}"?',
    values: { title },
  });
export const DELETE_TASK_BODY = (subtasks: number) =>
  i18n.translate('xpack.cases.investigations.procedure.deleteTaskBody', {
    defaultMessage:
      "{subtasks, plural, =0 {This can't be undone.} one {This also deletes its # sub-task. This can't be undone.} other {This also deletes its # sub-tasks. This can't be undone.}}",
    values: { subtasks },
  });
export const DELETE_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.deleteSuccess', {
    defaultMessage: 'Deleted "{title}".',
    values: { title },
  });

/* Add task form */
export const FIELD_TITLE = i18n.translate('xpack.cases.investigations.procedure.fieldTitle', {
  defaultMessage: 'Title',
});
export const FIELD_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.procedure.fieldDescription',
  { defaultMessage: 'Description' }
);
export const FIELD_PHASE = i18n.translate('xpack.cases.investigations.procedure.fieldPhase', {
  defaultMessage: 'Phase',
});
export const FIELD_ASSIGNEES = i18n.translate(
  'xpack.cases.investigations.procedure.fieldAssignees',
  { defaultMessage: 'Assignees' }
);
export const FIELD_OWNER_TYPE = i18n.translate(
  'xpack.cases.investigations.procedure.fieldOwnerType',
  { defaultMessage: 'Owner type' }
);
export const FIELD_TEAM_NAME = i18n.translate(
  'xpack.cases.investigations.procedure.fieldTeamName',
  { defaultMessage: 'Team name' }
);
export const FIELD_REQUIRED_HELP = i18n.translate(
  'xpack.cases.investigations.procedure.fieldRequiredHelp',
  { defaultMessage: 'Mark this task as part of the required procedure.' }
);
export const FIELD_WORKFLOW = i18n.translate('xpack.cases.investigations.procedure.fieldWorkflow', {
  defaultMessage: 'Workflow',
});
export const FIELD_WORKFLOW_HELP = i18n.translate(
  'xpack.cases.investigations.procedure.fieldWorkflowHelp',
  { defaultMessage: 'Optional. Running it from the task completes the task when the run succeeds.' }
);
export const NO_WORKFLOW = i18n.translate('xpack.cases.investigations.procedure.noWorkflow', {
  defaultMessage: 'No workflow',
});
export const WORKFLOWS_UNAVAILABLE = i18n.translate(
  'xpack.cases.investigations.procedure.workflowsUnavailable',
  { defaultMessage: 'Workflows is not available in this space.' }
);
export const SUBTASK_OF = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.subtaskOf', {
    defaultMessage: 'Sub-task of "{title}"',
    values: { title },
  });
export const TITLE_REQUIRED = i18n.translate('xpack.cases.investigations.procedure.titleRequired', {
  defaultMessage: 'Title is required.',
});
export const TITLE_TOO_LONG = i18n.translate('xpack.cases.investigations.procedure.titleTooLong', {
  defaultMessage: 'Use 512 characters or fewer.',
});
export const TEXT_TOO_LONG = i18n.translate('xpack.cases.investigations.procedure.textTooLong', {
  defaultMessage: 'Use 2,048 characters or fewer.',
});

/* Empty and apply */
export const EMPTY_TITLE = i18n.translate('xpack.cases.investigations.procedure.emptyTitle', {
  defaultMessage: 'No tasks yet',
});
export const EMPTY_BODY = (type: string) =>
  i18n.translate('xpack.cases.investigations.procedure.emptyBody', {
    defaultMessage: 'Add a task or apply the {type} task list to track this investigation.',
    values: { type },
  });
export const APPLY_PROCEDURE = i18n.translate(
  'xpack.cases.investigations.procedure.applyProcedure',
  { defaultMessage: 'Apply procedure' }
);
export const APPLY_TITLE = (type: string) =>
  i18n.translate('xpack.cases.investigations.procedure.applyTitle', {
    defaultMessage: 'Apply the {type} procedure?',
    values: { type },
  });
export const APPLY_BODY_NO_TASKS = (type: string) =>
  i18n.translate('xpack.cases.investigations.procedure.applyBodyNoTasks', {
    defaultMessage: 'This adds the tasks of the {type} task list to this investigation.',
    values: { type },
  });
export const APPLY_BODY_REPLACE = (type: string, open: number) =>
  i18n.translate('xpack.cases.investigations.procedure.applyBodyReplace', {
    defaultMessage:
      '{open, plural, one {# unfinished task is} other {# unfinished tasks are}} replaced by the tasks of the {type} task list. Tasks that are completed or cancelled stay.',
    values: { type, open },
  });
export const APPLY_CONFIRM = i18n.translate('xpack.cases.investigations.procedure.applyConfirm', {
  defaultMessage: 'Replace unfinished tasks',
});
export const APPLY_SUCCESS = (type: string) =>
  i18n.translate('xpack.cases.investigations.procedure.applySuccess', {
    defaultMessage: 'Applied the {type} procedure.',
    values: { type },
  });
export const NO_TEMPLATE_FOR_TYPE = i18n.translate(
  'xpack.cases.investigations.procedure.noTemplateForType',
  { defaultMessage: 'This template has no tasks yet. Add some in Edit task list first.' }
);

/* Task list editor */
export const EDITOR_SAVED_BADGE = i18n.translate(
  'xpack.cases.investigations.procedure.editorSavedBadge',
  { defaultMessage: 'Saved' }
);
export const EDITOR_DEFAULT_BADGE = i18n.translate(
  'xpack.cases.investigations.procedure.editorDefaultBadge',
  { defaultMessage: 'Built-in default' }
);
export const EDITOR_READ_ONLY_TITLE = i18n.translate(
  'xpack.cases.investigations.procedure.editorReadOnlyTitle',
  { defaultMessage: 'You can view task lists but not change them' }
);
export const EDITOR_READ_ONLY_BODY = i18n.translate(
  'xpack.cases.investigations.procedure.editorReadOnlyBody',
  { defaultMessage: 'Changing a task list needs the Cases settings privilege.' }
);
export const EDITOR_LOADING = i18n.translate('xpack.cases.investigations.procedure.editorLoading', {
  defaultMessage: 'Loading task lists',
});
export const EDITOR_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.procedure.editorLoadError',
  { defaultMessage: 'The task lists could not be loaded' }
);
export const EDITOR_NO_TASKS = i18n.translate(
  'xpack.cases.investigations.procedure.editorNoTasks',
  { defaultMessage: 'This task list has no tasks yet.' }
);
export const EDITOR_DRAG_HELP = i18n.translate(
  'xpack.cases.investigations.procedure.editorDragHelp',
  { defaultMessage: 'Drag tasks to change the order analysts see them in.' }
);
export const EDITOR_ADD_TASK = i18n.translate(
  'xpack.cases.investigations.procedure.editorAddTask',
  { defaultMessage: 'Add task' }
);
export const EDITOR_ADD_SUBTASK = i18n.translate(
  'xpack.cases.investigations.procedure.editorAddSubtask',
  { defaultMessage: 'Add sub-task' }
);
export const EDITOR_NEW_TASK = i18n.translate(
  'xpack.cases.investigations.procedure.editorNewTask',
  { defaultMessage: 'New task' }
);
export const EDITOR_NEW_SUBTASK = i18n.translate(
  'xpack.cases.investigations.procedure.editorNewSubtask',
  { defaultMessage: 'New sub-task' }
);
export const EDITOR_TASK_TITLE = i18n.translate(
  'xpack.cases.investigations.procedure.editorTaskTitle',
  { defaultMessage: 'Task title' }
);
export const EDITOR_SUBTASK_TITLE = i18n.translate(
  'xpack.cases.investigations.procedure.editorSubtaskTitle',
  { defaultMessage: 'Sub-task title' }
);
export const EDITOR_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.procedure.editorDescription',
  { defaultMessage: 'Description (optional)' }
);
export const EDITOR_PHASE = i18n.translate('xpack.cases.investigations.procedure.editorPhase', {
  defaultMessage: 'Phase',
});
export const EDITOR_OWNER_TYPE = i18n.translate(
  'xpack.cases.investigations.procedure.editorOwnerType',
  { defaultMessage: 'Owner type' }
);
export const EDITOR_OWNER_NAME = i18n.translate(
  'xpack.cases.investigations.procedure.editorOwnerName',
  { defaultMessage: 'Team name' }
);
export const EDITOR_OWNER_NAME_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.procedure.editorOwnerNamePlaceholder',
  { defaultMessage: 'Optional' }
);
export const EDITOR_PRIORITY = i18n.translate(
  'xpack.cases.investigations.procedure.editorPriority',
  { defaultMessage: 'Priority' }
);
export const EDITOR_DUE_WITHIN = i18n.translate(
  'xpack.cases.investigations.procedure.editorDueWithin',
  { defaultMessage: 'Due within' }
);
export const EDITOR_DUE_WITHIN_UNIT = i18n.translate(
  'xpack.cases.investigations.procedure.editorDueWithinUnit',
  { defaultMessage: 'Unit of the deadline' }
);
export const EDITOR_DUE_WITHIN_HELP = i18n.translate(
  'xpack.cases.investigations.procedure.editorDueWithinHelp',
  { defaultMessage: 'Leave empty for no deadline.' }
);
export const EDITOR_DUE_WITHIN_INVALID = i18n.translate(
  'xpack.cases.investigations.procedure.editorDueWithinInvalid',
  { defaultMessage: 'Enter a number from 1 to 100,000, or leave empty.' }
);
export const UNIT_MINUTES = i18n.translate('xpack.cases.investigations.procedure.unitMinutes', {
  defaultMessage: 'minutes',
});
export const UNIT_HOURS = i18n.translate('xpack.cases.investigations.procedure.unitHours', {
  defaultMessage: 'hours',
});
export const UNIT_DAYS = i18n.translate('xpack.cases.investigations.procedure.unitDays', {
  defaultMessage: 'days',
});
export const EDITOR_COMPLETED_WHEN = i18n.translate(
  'xpack.cases.investigations.procedure.editorCompletedWhen',
  { defaultMessage: 'Completed when' }
);
export const EDITOR_MANUAL = i18n.translate('xpack.cases.investigations.procedure.editorManual', {
  defaultMessage: 'Done by hand',
});
export const EDITOR_WHEN_CLAIM = i18n.translate(
  'xpack.cases.investigations.procedure.editorWhenClaim',
  { defaultMessage: 'A claim is settled' }
);
export const EDITOR_WHEN_ACTION = i18n.translate(
  'xpack.cases.investigations.procedure.editorWhenAction',
  { defaultMessage: 'An action is approved' }
);
export const EDITOR_CLAIM_QUESTION = i18n.translate(
  'xpack.cases.investigations.procedure.editorClaimQuestion',
  { defaultMessage: 'Question the claim asks' }
);
export const EDITOR_ACTION_CATEGORY = i18n.translate(
  'xpack.cases.investigations.procedure.editorActionCategory',
  { defaultMessage: 'Action category' }
);
export const EDITOR_AFTER = i18n.translate('xpack.cases.investigations.procedure.editorAfter', {
  defaultMessage: 'Starts after',
});
export const EDITOR_AFTER_NONE = i18n.translate(
  'xpack.cases.investigations.procedure.editorAfterNone',
  { defaultMessage: 'No dependency' }
);
export const EDITOR_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.editorRequired',
  { defaultMessage: 'Required' }
);
export const EDITOR_REMOVE = i18n.translate('xpack.cases.investigations.procedure.editorRemove', {
  defaultMessage: 'Remove task',
});
export const EDITOR_REMOVE_SUBTASK = i18n.translate(
  'xpack.cases.investigations.procedure.editorRemoveSubtask',
  { defaultMessage: 'Remove sub-task' }
);
export const EDITOR_TASK_NUMBER = (number: number) =>
  i18n.translate('xpack.cases.investigations.procedure.editorTaskNumber', {
    defaultMessage: 'Task {number}',
    values: { number },
  });
export const EDITOR_SAVE = i18n.translate('xpack.cases.investigations.procedure.editorSave', {
  defaultMessage: 'Save task list',
});
export const EDITOR_SAVED = (template: string) =>
  i18n.translate('xpack.cases.investigations.procedure.editorSaved', {
    defaultMessage: 'Saved the {template} task list.',
    values: { template },
  });
export const EDITOR_SAVE_ERROR = i18n.translate(
  'xpack.cases.investigations.procedure.editorSaveError',
  { defaultMessage: 'The task list could not be saved' }
);
export const EDITOR_CANCEL = i18n.translate('xpack.cases.investigations.procedure.editorCancel', {
  defaultMessage: 'Cancel',
});
export const EDITOR_CLOSE = i18n.translate('xpack.cases.investigations.procedure.editorClose', {
  defaultMessage: 'Close',
});
export const EDITOR_TITLE_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.editorTitleRequired',
  { defaultMessage: 'Add a title.' }
);
export const EDITOR_TITLE_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.procedure.editorTitleTooLong',
  { defaultMessage: 'Use 512 characters or fewer.' }
);
export const EDITOR_TITLE_DUPLICATE = i18n.translate(
  'xpack.cases.investigations.procedure.editorTitleDuplicate',
  { defaultMessage: 'Task titles must be unique in a task list.' }
);
export const EDITOR_CLAIM_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.editorClaimRequired',
  { defaultMessage: 'Enter the question the claim asks.' }
);
export const EDITOR_TEXT_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.procedure.editorTextTooLong',
  { defaultMessage: 'Use 2,048 characters or fewer.' }
);
export const EDITOR_FIX_ERRORS = i18n.translate(
  'xpack.cases.investigations.procedure.editorFixErrors',
  { defaultMessage: 'Fix the highlighted fields before saving.' }
);
export const EDITOR_DISCARD_TITLE = i18n.translate(
  'xpack.cases.investigations.procedure.editorDiscardTitle',
  { defaultMessage: 'Discard your changes?' }
);
export const EDITOR_DISCARD_BODY = i18n.translate(
  'xpack.cases.investigations.procedure.editorDiscardBody',
  { defaultMessage: 'The edits to this task list have not been saved.' }
);
export const EDITOR_DISCARD_CONFIRM = i18n.translate(
  'xpack.cases.investigations.procedure.editorDiscardConfirm',
  { defaultMessage: 'Discard changes' }
);
export const EDITOR_KEEP_EDITING = i18n.translate(
  'xpack.cases.investigations.procedure.editorKeepEditing',
  { defaultMessage: 'Keep editing' }
);
