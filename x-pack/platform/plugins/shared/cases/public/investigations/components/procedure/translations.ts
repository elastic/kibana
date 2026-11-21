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
export const INVESTIGATION_TYPE = i18n.translate(
  'xpack.cases.investigations.procedure.investigationType',
  { defaultMessage: 'Investigation type' }
);
export const CONFIGURE = i18n.translate('xpack.cases.investigations.procedure.configure', {
  defaultMessage: 'Configure procedures',
});
export const TYPE_NOT_SET = i18n.translate('xpack.cases.investigations.procedure.typeNotSet', {
  defaultMessage: 'No type set',
});
export const PROGRESS_LABEL = i18n.translate('xpack.cases.investigations.procedure.progressLabel', {
  defaultMessage: 'Procedure progress',
});
export const DONE_OF_TOTAL = (done: number, total: number) =>
  i18n.translate('xpack.cases.investigations.procedure.doneOfTotal', {
    defaultMessage: '{done} of {total} done',
    values: { done, total },
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
      'The {type} procedure sets these tasks. Claims and approved actions complete their tasks automatically, and each completion names who or what did it.',
    values: { type },
  });
export const CLOSE_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.procedure.closeInvestigation',
  { defaultMessage: 'Close investigation' }
);
export const CLOSED = i18n.translate('xpack.cases.investigations.procedure.closed', {
  defaultMessage: 'Closed',
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

/* Phases and rows */
export const PHASE_COUNT = (done: number, total: number) =>
  i18n.translate('xpack.cases.investigations.procedure.phaseCount', {
    defaultMessage: '{done}/{total}',
    values: { done, total },
  });
export const REQUIRED = i18n.translate('xpack.cases.investigations.procedure.required', {
  defaultMessage: 'Required',
});
export const OPTIONAL = i18n.translate('xpack.cases.investigations.procedure.optional', {
  defaultMessage: 'Optional',
});
export const STATUS_TODO = i18n.translate('xpack.cases.investigations.procedure.statusTodo', {
  defaultMessage: 'To do',
});
export const STATUS_DOING = i18n.translate('xpack.cases.investigations.procedure.statusDoing', {
  defaultMessage: 'In progress',
});
export const STATUS_DONE = i18n.translate('xpack.cases.investigations.procedure.statusDone', {
  defaultMessage: 'Done',
});
export const STATUS_SKIPPED = i18n.translate('xpack.cases.investigations.procedure.statusSkipped', {
  defaultMessage: 'Not applicable',
});
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
export const NOT_APPLICABLE_NOTE = (reason: string) =>
  i18n.translate('xpack.cases.investigations.procedure.notApplicableNote', {
    defaultMessage: 'Not applicable. {reason}',
    values: { reason },
  });
export const NOT_APPLICABLE_BY = (name: string) =>
  i18n.translate('xpack.cases.investigations.procedure.notApplicableBy', {
    defaultMessage: 'Marked not applicable by {name}',
    values: { name },
  });
export const MARK_DONE = i18n.translate('xpack.cases.investigations.procedure.markDone', {
  defaultMessage: 'Mark done',
});
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
export const START = i18n.translate('xpack.cases.investigations.procedure.start', {
  defaultMessage: 'Start',
});
export const REOPEN = i18n.translate('xpack.cases.investigations.procedure.reopen', {
  defaultMessage: 'Reopen',
});
export const NOT_APPLICABLE_ACTION = i18n.translate(
  'xpack.cases.investigations.procedure.notApplicableAction',
  { defaultMessage: 'Mark as not applicable' }
);
export const MORE_ACTIONS = i18n.translate('xpack.cases.investigations.procedure.moreActions', {
  defaultMessage: 'More actions',
});
export const MARK_DONE_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.markDoneAria', {
    defaultMessage: 'Mark done: {title}',
    values: { title },
  });
export const REOPEN_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.reopenAria', {
    defaultMessage: 'Reopen: {title}',
    values: { title },
  });
export const MARK_DONE_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.markDoneSuccess', {
    defaultMessage: 'Completed "{title}".',
    values: { title },
  });
export const STARTED_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.startedSuccess', {
    defaultMessage: 'Started "{title}".',
    values: { title },
  });
export const REOPENED_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.reopenedSuccess', {
    defaultMessage: 'Reopened "{title}".',
    values: { title },
  });
export const ASSIGNED_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.assignedSuccess', {
    defaultMessage: 'Updated the owner of "{title}".',
    values: { title },
  });

/* Assign popover */
export const ASSIGN = i18n.translate('xpack.cases.investigations.procedure.assign', {
  defaultMessage: 'Assign',
});
export const ASSIGN_TO = i18n.translate('xpack.cases.investigations.procedure.assignTo', {
  defaultMessage: 'Assign to',
});
export const ASSIGN_ME = i18n.translate('xpack.cases.investigations.procedure.assignMe', {
  defaultMessage: 'Assign to me',
});
export const ASSIGN_PERSON = i18n.translate('xpack.cases.investigations.procedure.assignPerson', {
  defaultMessage: 'A person',
});
export const ASSIGN_PERSON_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.procedure.assignPersonPlaceholder',
  { defaultMessage: 'Name or username' }
);
export const ASSIGN_TEAM = i18n.translate('xpack.cases.investigations.procedure.assignTeam', {
  defaultMessage: 'A team',
});
export const ASSIGN_TEAM_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.procedure.assignTeamPlaceholder',
  { defaultMessage: 'Team name' }
);
export const ASSIGN_AGENT = (name: string) =>
  i18n.translate('xpack.cases.investigations.procedure.assignAgent', {
    defaultMessage: '{name} (agent)',
    values: { name },
  });
export const ASSIGN_AUTOMATION = i18n.translate(
  'xpack.cases.investigations.procedure.assignAutomation',
  { defaultMessage: 'Workflow (automation)' }
);
export const UNASSIGN = i18n.translate('xpack.cases.investigations.procedure.unassign', {
  defaultMessage: 'Unassign',
});
export const ASSIGN_SUBMIT = i18n.translate('xpack.cases.investigations.procedure.assignSubmit', {
  defaultMessage: 'Assign',
});
export const ASSIGN_NAME_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.assignNameRequired',
  { defaultMessage: 'Enter a name.' }
);
export const ASSIGN_NAME_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.procedure.assignNameTooLong',
  { defaultMessage: 'Use 512 characters or fewer.' }
);
export const PARTICIPANTS = i18n.translate('xpack.cases.investigations.procedure.participants', {
  defaultMessage: 'Participants',
});
export const ASSIGN_ARIA = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.assignAria', {
    defaultMessage: 'Assign: {title}',
    values: { title },
  });

/* Skip modal */
export const SKIP_TITLE = i18n.translate('xpack.cases.investigations.procedure.skipTitle', {
  defaultMessage: 'Mark as not applicable?',
});
export const SKIP_REQUIRED_WARNING = i18n.translate(
  'xpack.cases.investigations.procedure.skipRequiredWarning',
  { defaultMessage: 'This task is required to close. Explain why it does not apply.' }
);
export const SKIP_REASON_LABEL = i18n.translate(
  'xpack.cases.investigations.procedure.skipReasonLabel',
  { defaultMessage: 'Why does it not apply?' }
);
export const SKIP_REASON_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.procedure.skipReasonPlaceholder',
  { defaultMessage: 'Example: No mailboxes were involved.' }
);
export const SKIP_REASON_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.skipReasonRequired',
  { defaultMessage: 'Give a reason so the record explains the gap.' }
);
export const SKIP_REASON_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.procedure.skipReasonTooLong',
  { defaultMessage: 'Use 2,048 characters or fewer.' }
);
export const SKIP_SUBMIT = i18n.translate('xpack.cases.investigations.procedure.skipSubmit', {
  defaultMessage: 'Mark as not applicable',
});
export const SKIP_SUCCESS = (title: string) =>
  i18n.translate('xpack.cases.investigations.procedure.skipSuccess', {
    defaultMessage: 'Marked "{title}" as not applicable.',
    values: { title },
  });
export const CANCEL = i18n.translate('xpack.cases.investigations.procedure.cancel', {
  defaultMessage: 'Cancel',
});

/* Empty and apply */
export const EMPTY_TITLE = i18n.translate('xpack.cases.investigations.procedure.emptyTitle', {
  defaultMessage: 'No procedure applied',
});
export const EMPTY_BODY = i18n.translate('xpack.cases.investigations.procedure.emptyBody', {
  defaultMessage: 'Pick an investigation type to add its task list to this investigation.',
});
export const APPLY_PROCEDURE = i18n.translate(
  'xpack.cases.investigations.procedure.applyProcedure',
  { defaultMessage: 'Apply procedure' }
);
export const APPLY_DIFFERENT = i18n.translate(
  'xpack.cases.investigations.procedure.applyDifferent',
  { defaultMessage: 'Apply a different procedure' }
);
export const APPLY_TITLE = i18n.translate('xpack.cases.investigations.procedure.applyTitle', {
  defaultMessage: 'Apply a procedure',
});
export const APPLY_TYPE_LABEL = i18n.translate(
  'xpack.cases.investigations.procedure.applyTypeLabel',
  { defaultMessage: 'Procedure to apply' }
);
export const APPLY_BODY_NO_TASKS = (type: string) =>
  i18n.translate('xpack.cases.investigations.procedure.applyBodyNoTasks', {
    defaultMessage: 'This adds the tasks of the {type} procedure to this investigation.',
    values: {
      type,
    },
  });
export const APPLY_BODY_REPLACE = (type: string, open: number) =>
  i18n.translate('xpack.cases.investigations.procedure.applyBodyReplace', {
    defaultMessage:
      'This changes the investigation type to {type}. {open, plural, one {# unfinished task is} other {# unfinished tasks are}} replaced by the tasks of that procedure. Tasks that are done or not applicable stay.',
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
  { defaultMessage: 'This type has no procedure yet. Configure one first.' }
);

/* Template editor */
export const EDITOR_TITLE = i18n.translate('xpack.cases.investigations.procedure.editorTitle', {
  defaultMessage: 'Configure procedures',
});
export const EDITOR_HINT = i18n.translate('xpack.cases.investigations.procedure.editorHint', {
  defaultMessage: 'The procedure is the default task list for new investigations of this type.',
});
export const EDITOR_TYPE_LABEL = i18n.translate(
  'xpack.cases.investigations.procedure.editorTypeLabel',
  { defaultMessage: 'Investigation type' }
);
export const EDITOR_LOADING = i18n.translate('xpack.cases.investigations.procedure.editorLoading', {
  defaultMessage: 'Loading procedures',
});
export const EDITOR_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.procedure.editorLoadError',
  { defaultMessage: 'The procedures could not be loaded' }
);
export const EDITOR_NO_TASKS = i18n.translate(
  'xpack.cases.investigations.procedure.editorNoTasks',
  { defaultMessage: 'This procedure has no tasks yet.' }
);
export const EDITOR_ADD_TASK = i18n.translate(
  'xpack.cases.investigations.procedure.editorAddTask',
  { defaultMessage: 'Add task' }
);
export const EDITOR_NEW_TASK = i18n.translate(
  'xpack.cases.investigations.procedure.editorNewTask',
  { defaultMessage: 'New task' }
);
export const EDITOR_TASK_TITLE = i18n.translate(
  'xpack.cases.investigations.procedure.editorTaskTitle',
  { defaultMessage: 'Task title' }
);
export const EDITOR_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.procedure.editorDescription',
  { defaultMessage: 'Description' }
);
export const EDITOR_PHASE = i18n.translate('xpack.cases.investigations.procedure.editorPhase', {
  defaultMessage: 'Phase',
});
export const EDITOR_OWNER_TYPE = i18n.translate(
  'xpack.cases.investigations.procedure.editorOwnerType',
  { defaultMessage: 'Default owner type' }
);
export const EDITOR_OWNER_NAME = i18n.translate(
  'xpack.cases.investigations.procedure.editorOwnerName',
  { defaultMessage: 'Owner name' }
);
export const EDITOR_OWNER_NAME_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.procedure.editorOwnerNamePlaceholder',
  { defaultMessage: 'Optional' }
);
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
  { defaultMessage: 'Required to close' }
);
export const EDITOR_MOVE_UP = i18n.translate('xpack.cases.investigations.procedure.editorMoveUp', {
  defaultMessage: 'Move up',
});
export const EDITOR_MOVE_DOWN = i18n.translate(
  'xpack.cases.investigations.procedure.editorMoveDown',
  { defaultMessage: 'Move down' }
);
export const EDITOR_REMOVE = i18n.translate('xpack.cases.investigations.procedure.editorRemove', {
  defaultMessage: 'Remove task',
});
export const EDITOR_TASK_NUMBER = (number: number) =>
  i18n.translate('xpack.cases.investigations.procedure.editorTaskNumber', {
    defaultMessage: 'Task {number}',
    values: { number },
  });
export const EDITOR_SAVE = i18n.translate('xpack.cases.investigations.procedure.editorSave', {
  defaultMessage: 'Save procedure',
});
export const EDITOR_SAVE_APPLY = i18n.translate(
  'xpack.cases.investigations.procedure.editorSaveApply',
  { defaultMessage: 'Save and apply to this investigation' }
);
export const EDITOR_CANCEL = i18n.translate('xpack.cases.investigations.procedure.editorCancel', {
  defaultMessage: 'Cancel',
});
export const EDITOR_TITLE_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.editorTitleRequired',
  { defaultMessage: 'Every task needs a title.' }
);
export const EDITOR_TITLE_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.procedure.editorTitleTooLong',
  { defaultMessage: 'Use 512 characters or fewer.' }
);
export const EDITOR_TITLE_DUPLICATE = i18n.translate(
  'xpack.cases.investigations.procedure.editorTitleDuplicate',
  { defaultMessage: 'Task titles must be unique in a procedure.' }
);
export const EDITOR_CLAIM_REQUIRED = i18n.translate(
  'xpack.cases.investigations.procedure.editorClaimRequired',
  { defaultMessage: 'Enter the question the claim asks.' }
);
export const EDITOR_TEXT_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.procedure.editorTextTooLong',
  { defaultMessage: 'Use 2,048 characters or fewer.' }
);
export const EDITOR_TOO_MANY = i18n.translate(
  'xpack.cases.investigations.procedure.editorTooMany',
  { defaultMessage: 'A procedure holds at most 200 tasks.' }
);
export const EDITOR_FIX_ERRORS = i18n.translate(
  'xpack.cases.investigations.procedure.editorFixErrors',
  { defaultMessage: 'Fix the highlighted tasks before saving.' }
);
export const EDITOR_DISCARD_TITLE = i18n.translate(
  'xpack.cases.investigations.procedure.editorDiscardTitle',
  { defaultMessage: 'Discard your changes?' }
);
export const EDITOR_DISCARD_BODY = i18n.translate(
  'xpack.cases.investigations.procedure.editorDiscardBody',
  { defaultMessage: 'The edits to this procedure have not been saved.' }
);
export const EDITOR_DISCARD_CONFIRM = i18n.translate(
  'xpack.cases.investigations.procedure.editorDiscardConfirm',
  { defaultMessage: 'Discard changes' }
);
export const EDITOR_KEEP_EDITING = i18n.translate(
  'xpack.cases.investigations.procedure.editorKeepEditing',
  { defaultMessage: 'Keep editing' }
);
export const EDITOR_SAVED_APPLIED = (type: string) =>
  i18n.translate('xpack.cases.investigations.procedure.editorSavedApplied', {
    defaultMessage: 'Saved and applied the {type} procedure.',
    values: { type },
  });
export const EDITOR_APPLY_TITLE = i18n.translate(
  'xpack.cases.investigations.procedure.editorApplyTitle',
  { defaultMessage: 'Apply the saved procedure?' }
);
export const EDITOR_APPLY_BODY = (type: string, open: number) =>
  i18n.translate('xpack.cases.investigations.procedure.editorApplyBody', {
    defaultMessage:
      'The {type} procedure is saved. {open, plural, one {# unfinished task is} other {# unfinished tasks are}} replaced by its tasks, which resets owners you set by hand. Tasks that are done or not applicable stay.',
    values: { type, open },
  });
export const EDITOR_APPLY_CONFIRM = i18n.translate(
  'xpack.cases.investigations.procedure.editorApplyConfirm',
  { defaultMessage: 'Replace and apply' }
);
