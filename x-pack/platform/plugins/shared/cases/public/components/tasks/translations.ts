/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TASKS_TAB_TITLE = i18n.translate('xpack.cases.caseView.tabs.tasks', {
  defaultMessage: 'Tasks',
});

export const ADD_TASK = i18n.translate('xpack.cases.tasks.addTask', {
  defaultMessage: 'Add task',
});

export const NO_TASKS = i18n.translate('xpack.cases.tasks.noTasks', {
  defaultMessage: 'No tasks',
});

export const NO_TASKS_DESCRIPTION = i18n.translate('xpack.cases.tasks.noTasksDescription', {
  defaultMessage: 'Add a task to track work items for this case.',
});

export const TASK_TITLE = i18n.translate('xpack.cases.tasks.columns.title', {
  defaultMessage: 'Title',
});

export const TASK_STATUS = i18n.translate('xpack.cases.tasks.columns.status', {
  defaultMessage: 'Status',
});

export const TASK_PRIORITY = i18n.translate('xpack.cases.tasks.columns.priority', {
  defaultMessage: 'Priority',
});

export const TASK_ASSIGNEES = i18n.translate('xpack.cases.tasks.columns.assignees', {
  defaultMessage: 'Assignees',
});

export const TASK_DUE_DATE = i18n.translate('xpack.cases.tasks.columns.dueDate', {
  defaultMessage: 'Due date',
});

export const TASK_ACTIONS = i18n.translate('xpack.cases.tasks.columns.actions', {
  defaultMessage: 'Actions',
});

export const DELETE_TASK = i18n.translate('xpack.cases.tasks.deleteTask', {
  defaultMessage: 'Delete task',
});

export const CONFIRM_DELETE_TASK = i18n.translate('xpack.cases.tasks.confirmDelete', {
  defaultMessage: 'Are you sure you want to delete this task?',
});

export const STATUS_OPEN = i18n.translate('xpack.cases.tasks.status.open', {
  defaultMessage: 'Open',
});

export const STATUS_IN_PROGRESS = i18n.translate('xpack.cases.tasks.status.inProgress', {
  defaultMessage: 'In progress',
});

export const STATUS_COMPLETED = i18n.translate('xpack.cases.tasks.status.completed', {
  defaultMessage: 'Completed',
});

export const STATUS_CANCELLED = i18n.translate('xpack.cases.tasks.status.cancelled', {
  defaultMessage: 'Cancelled',
});

export const PRIORITY_LOW = i18n.translate('xpack.cases.tasks.priority.low', {
  defaultMessage: 'Low',
});

export const PRIORITY_MEDIUM = i18n.translate('xpack.cases.tasks.priority.medium', {
  defaultMessage: 'Medium',
});

export const PRIORITY_HIGH = i18n.translate('xpack.cases.tasks.priority.high', {
  defaultMessage: 'High',
});

export const PRIORITY_CRITICAL = i18n.translate('xpack.cases.tasks.priority.critical', {
  defaultMessage: 'Critical',
});

export const CANCEL = i18n.translate('xpack.cases.tasks.cancel', {
  defaultMessage: 'Cancel',
});

export const TASK_DESCRIPTION = i18n.translate('xpack.cases.tasks.fields.description', {
  defaultMessage: 'Description',
});

export const TASK_TITLE_PLACEHOLDER = i18n.translate('xpack.cases.tasks.fields.titlePlaceholder', {
  defaultMessage: 'Enter a task title',
});

export const TASK_DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.cases.tasks.fields.descriptionPlaceholder',
  {
    defaultMessage: 'Describe the task (optional)',
  }
);

export const TASK_DUE_DATE_PLACEHOLDER = i18n.translate(
  'xpack.cases.tasks.fields.dueDatePlaceholder',
  {
    defaultMessage: 'Select a due date',
  }
);

export const TASK_TITLE_REQUIRED = i18n.translate('xpack.cases.tasks.fields.titleRequired', {
  defaultMessage: 'A title is required.',
});

export const ASSIGN_YOURSELF = i18n.translate('xpack.cases.tasks.fields.assignYourself', {
  defaultMessage: 'Assign yourself',
});

export const COMPLETION_NOTES = i18n.translate('xpack.cases.tasks.fields.completionNotes', {
  defaultMessage: 'Completion notes',
});

export const COMPLETION_NOTES_PLACEHOLDER = i18n.translate(
  'xpack.cases.tasks.fields.completionNotesPlaceholder',
  {
    defaultMessage: 'Describe what was done to complete this task (optional)',
  }
);

export const EDIT_TASK = i18n.translate('xpack.cases.tasks.editTask', {
  defaultMessage: 'Edit task',
});

export const SAVE_CHANGES = i18n.translate('xpack.cases.tasks.saveChanges', {
  defaultMessage: 'Save changes',
});

export const ADD_SUBTASK = i18n.translate('xpack.cases.tasks.addSubtask', {
  defaultMessage: 'Add sub-task',
});

export const SUBTASK_OF = (parentTitle: string) =>
  i18n.translate('xpack.cases.tasks.subtaskOf', {
    values: { parentTitle },
    defaultMessage: 'Sub-task of "{parentTitle}"',
  });

export const EXPAND_SUBTASKS = i18n.translate('xpack.cases.tasks.expandSubtasks', {
  defaultMessage: 'Expand sub-tasks',
});

export const COLLAPSE_SUBTASKS = i18n.translate('xpack.cases.tasks.collapseSubtasks', {
  defaultMessage: 'Collapse sub-tasks',
});

export const CLICK_TO_ADVANCE_STATUS = i18n.translate('xpack.cases.tasks.clickToAdvanceStatus', {
  defaultMessage: 'Click to advance status',
});

export const MARK_COMPLETE = i18n.translate('xpack.cases.tasks.markComplete', {
  defaultMessage: 'Mark as complete',
});

export const MARK_INCOMPLETE = i18n.translate('xpack.cases.tasks.markIncomplete', {
  defaultMessage: 'Mark as incomplete',
});

export const APPLY_TEMPLATE = i18n.translate('xpack.cases.tasks.applyTemplate', {
  defaultMessage: 'Apply template',
});

export const APPLY_TEMPLATE_DESCRIPTION = i18n.translate(
  'xpack.cases.tasks.applyTemplateDescription',
  {
    defaultMessage: 'Select a task template to add its tasks to this case.',
  }
);

export const APPLY_TEMPLATE_CONFIRM = i18n.translate('xpack.cases.tasks.applyTemplateConfirm', {
  defaultMessage: 'Apply',
});

export const APPLY_TEMPLATE_ERROR = i18n.translate('xpack.cases.tasks.applyTemplateError', {
  defaultMessage: 'Failed to apply template. Please try again.',
});

export const NO_TASK_TEMPLATES_AVAILABLE = i18n.translate(
  'xpack.cases.tasks.noTaskTemplatesAvailable',
  {
    defaultMessage: 'No task templates',
  }
);

export const NO_TASK_TEMPLATES_AVAILABLE_DESCRIPTION = i18n.translate(
  'xpack.cases.tasks.noTaskTemplatesAvailableDescription',
  {
    defaultMessage:
      'Create task templates in case settings to quickly add predefined sets of tasks.',
  }
);

export const VIEW_LIST = i18n.translate('xpack.cases.tasks.viewList', {
  defaultMessage: 'List',
});

export const VIEW_BOARD = i18n.translate('xpack.cases.tasks.viewBoard', {
  defaultMessage: 'Board',
});

export const COLUMNS = i18n.translate('xpack.cases.tasks.columns', {
  defaultMessage: 'Columns',
});

export const VISIBLE_COLUMNS = i18n.translate('xpack.cases.tasks.visibleColumns', {
  defaultMessage: 'Visible columns',
});

export const NO_STATUS = i18n.translate('xpack.cases.tasks.status.noStatus', {
  defaultMessage: 'No status',
});

export const UNASSIGNED_COLUMN_LABEL = i18n.translate('xpack.cases.tasks.board.unassigned', {
  defaultMessage: 'Unassigned',
});

export const SUBTASKS_LABEL = (count: number) =>
  i18n.translate('xpack.cases.tasks.subtasksLabel', {
    values: { count },
    defaultMessage: '{count} sub-task{count, plural, one {} other {s}}',
  });
