/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TASK = i18n.translate('xpack.cases.tasks.addTask', {
  defaultMessage: 'Add task',
});

export const ADD_SUBTASK = i18n.translate('xpack.cases.tasks.addSubtask', {
  defaultMessage: 'Add sub-task',
});

export const EDIT_TASK = i18n.translate('xpack.cases.tasks.editTask', {
  defaultMessage: 'Edit task',
});

export const SAVE_TASK = i18n.translate('xpack.cases.tasks.saveTask', {
  defaultMessage: 'Save task',
});

export const DELETE_TASK = i18n.translate('xpack.cases.tasks.deleteTask', {
  defaultMessage: 'Delete task',
});

export const CANCEL = i18n.translate('xpack.cases.tasks.cancel', {
  defaultMessage: 'Cancel',
});

export const APPLY_TASK_LIST = i18n.translate('xpack.cases.tasks.applyTaskList', {
  defaultMessage: 'Apply task list',
});

export const SELECT_TASK_LIST = i18n.translate('xpack.cases.tasks.selectTaskList', {
  defaultMessage: 'Select a task list',
});

export const NO_TASK_LISTS = i18n.translate('xpack.cases.tasks.noTaskLists', {
  defaultMessage: 'No task lists are available for this solution.',
});

export const TASK_LIST_TASK_COUNT = (count: number) =>
  i18n.translate('xpack.cases.tasks.taskListTaskCount', {
    values: { count },
    defaultMessage: '{count, plural, one {# task} other {# tasks}}',
  });

export const SHOWING_TASKS = (total: number, open: number) =>
  i18n.translate('xpack.cases.tasks.showingTasks', {
    values: { total, open },
    defaultMessage: 'Showing {total, plural, one {# task} other {# tasks}}, {open} open',
  });

export const NO_TASKS_TITLE = i18n.translate('xpack.cases.tasks.noTasksTitle', {
  defaultMessage: 'No tasks yet',
});

export const NO_TASKS_BODY = i18n.translate('xpack.cases.tasks.noTasksBody', {
  defaultMessage: 'Add a task or apply a task list to track this investigation.',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.cases.tasks.loadErrorTitle', {
  defaultMessage: "Tasks couldn't be loaded",
});

export const TRY_AGAIN = i18n.translate('xpack.cases.tasks.tryAgain', {
  defaultMessage: 'Try again',
});

export const COLUMN_DONE = i18n.translate('xpack.cases.tasks.columns.done', {
  defaultMessage: 'Done',
});

export const COLUMN_TASK = i18n.translate('xpack.cases.tasks.columns.task', {
  defaultMessage: 'Task',
});

export const COLUMN_STATUS = i18n.translate('xpack.cases.tasks.columns.status', {
  defaultMessage: 'Status',
});

export const COLUMN_PRIORITY = i18n.translate('xpack.cases.tasks.columns.priority', {
  defaultMessage: 'Priority',
});

export const COLUMN_ASSIGNEES = i18n.translate('xpack.cases.tasks.columns.assignees', {
  defaultMessage: 'Assignees',
});

export const COLUMN_DUE = i18n.translate('xpack.cases.tasks.columns.due', {
  defaultMessage: 'Due',
});

export const COLUMN_ACTIONS = i18n.translate('xpack.cases.tasks.columns.actions', {
  defaultMessage: 'Actions',
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

export const MARK_IN_PROGRESS = i18n.translate('xpack.cases.tasks.actions.markInProgress', {
  defaultMessage: 'Mark in progress',
});

export const CANCEL_TASK = i18n.translate('xpack.cases.tasks.actions.cancelTask', {
  defaultMessage: 'Cancel task',
});

export const REOPEN_TASK = i18n.translate('xpack.cases.tasks.actions.reopenTask', {
  defaultMessage: 'Reopen task',
});

export const TASK_ACTIONS_ARIA = (title: string) =>
  i18n.translate('xpack.cases.tasks.actions.ariaLabel', {
    values: { title },
    defaultMessage: 'Actions for {title}',
  });

export const MARK_DONE_ARIA = (title: string) =>
  i18n.translate('xpack.cases.tasks.markDoneAriaLabel', {
    values: { title },
    defaultMessage: 'Mark {title} as done',
  });

export const REOPEN_ARIA = (title: string) =>
  i18n.translate('xpack.cases.tasks.reopenAriaLabel', {
    values: { title },
    defaultMessage: 'Reopen {title}',
  });

export const OVERDUE = i18n.translate('xpack.cases.tasks.overdue', {
  defaultMessage: 'overdue',
});

export const DELETE_TASK_TITLE = (title: string) =>
  i18n.translate('xpack.cases.tasks.deleteModal.title', {
    values: { title },
    defaultMessage: 'Delete task "{title}"?',
  });

export const DELETE_TASK_BODY = (subtasks: number) =>
  i18n.translate('xpack.cases.tasks.deleteModal.body', {
    values: { subtasks },
    defaultMessage:
      "{subtasks, plural, =0 {This can't be undone.} one {This also deletes its # sub-task. This can't be undone.} other {This also deletes its # sub-tasks. This can't be undone.}}",
  });

export const FIELD_TITLE = i18n.translate('xpack.cases.tasks.fields.title', {
  defaultMessage: 'Title',
});

export const FIELD_DESCRIPTION = i18n.translate('xpack.cases.tasks.fields.description', {
  defaultMessage: 'Description',
});

export const FIELD_PRIORITY = i18n.translate('xpack.cases.tasks.fields.priority', {
  defaultMessage: 'Priority',
});

export const FIELD_DUE_DATE = i18n.translate('xpack.cases.tasks.fields.dueDate', {
  defaultMessage: 'Due date',
});

export const FIELD_ASSIGNEES = i18n.translate('xpack.cases.tasks.fields.assignees', {
  defaultMessage: 'Assignees',
});

export const TITLE_REQUIRED = i18n.translate('xpack.cases.tasks.fields.titleRequired', {
  defaultMessage: 'Title is required.',
});

export const SUBTASK_OF = (title: string) =>
  i18n.translate('xpack.cases.tasks.subtaskOf', {
    values: { title },
    defaultMessage: 'Sub-task of "{title}"',
  });

export const SEARCH_USERS = i18n.translate('xpack.cases.tasks.fields.searchUsers', {
  defaultMessage: 'Search users',
});

export const ASSIGN_MYSELF = i18n.translate('xpack.cases.tasks.fields.assignMyself', {
  defaultMessage: 'Assign myself',
});
