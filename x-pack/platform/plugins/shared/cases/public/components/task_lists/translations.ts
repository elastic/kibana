/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.cases.taskLists.title', {
  defaultMessage: 'Task lists',
});

export const DESCRIPTION = i18n.translate('xpack.cases.taskLists.description', {
  defaultMessage:
    'Reusable checklists analysts can apply to a case. Reference a task list from a template to add its tasks when a case is created.',
});

export const ADD_TASK_LIST = i18n.translate('xpack.cases.taskLists.add', {
  defaultMessage: 'Add task list',
});

export const EDIT_TASK_LIST = i18n.translate('xpack.cases.taskLists.edit', {
  defaultMessage: 'Edit task list',
});

export const SAVE_TASK_LIST = i18n.translate('xpack.cases.taskLists.save', {
  defaultMessage: 'Save task list',
});

export const DELETE_TASK_LIST = i18n.translate('xpack.cases.taskLists.delete', {
  defaultMessage: 'Delete task list',
});

export const CANCEL = i18n.translate('xpack.cases.taskLists.cancel', {
  defaultMessage: 'Cancel',
});

export const NO_TASK_LISTS = i18n.translate('xpack.cases.taskLists.empty', {
  defaultMessage: 'No task lists yet. Add one to reuse a checklist across cases.',
});

export const MAX_TASK_LISTS = (max: number) =>
  i18n.translate('xpack.cases.taskLists.max', {
    values: { max },
    defaultMessage: 'You have reached the maximum of {max} task lists.',
  });

export const EDIT_ARIA = (name: string) =>
  i18n.translate('xpack.cases.taskLists.editAriaLabel', {
    values: { name },
    defaultMessage: 'Edit task list {name}',
  });

export const DELETE_ARIA = (name: string) =>
  i18n.translate('xpack.cases.taskLists.deleteAriaLabel', {
    values: { name },
    defaultMessage: 'Delete task list {name}',
  });

export const DELETE_TITLE = (name: string) =>
  i18n.translate('xpack.cases.taskLists.deleteModal.title', {
    values: { name },
    defaultMessage: 'Delete task list "{name}"?',
  });

export const DELETE_BODY = i18n.translate('xpack.cases.taskLists.deleteModal.body', {
  defaultMessage:
    "Templates that reference this task list stop adding its tasks. Tasks already added to cases are kept. This can't be undone.",
});

export const TASK_COUNT = (count: number) =>
  i18n.translate('xpack.cases.taskLists.taskCount', {
    values: { count },
    defaultMessage: '{count, plural, one {# task} other {# tasks}}',
  });

export const FIELD_NAME = i18n.translate('xpack.cases.taskLists.fields.name', {
  defaultMessage: 'Name',
});

export const FIELD_DESCRIPTION = i18n.translate('xpack.cases.taskLists.fields.description', {
  defaultMessage: 'Description',
});

export const FIELD_TAGS = i18n.translate('xpack.cases.taskLists.fields.tags', {
  defaultMessage: 'Tags',
});

export const FIELD_TASKS = i18n.translate('xpack.cases.taskLists.fields.tasks', {
  defaultMessage: 'Tasks',
});

export const TASK_TITLE_PLACEHOLDER = i18n.translate('xpack.cases.taskLists.fields.taskTitle', {
  defaultMessage: 'Task title',
});

export const SUBTASK_TITLE_PLACEHOLDER = i18n.translate(
  'xpack.cases.taskLists.fields.subtaskTitle',
  {
    defaultMessage: 'Sub-task title',
  }
);

export const TASK_DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.cases.taskLists.fields.taskDescription',
  {
    defaultMessage: 'Description (optional)',
  }
);

export const REQUIRED = i18n.translate('xpack.cases.taskLists.fields.required', {
  defaultMessage: 'Required',
});

export const REQUIRED_ON = i18n.translate('xpack.cases.taskLists.fields.requiredOn', {
  defaultMessage: 'Required',
});

export const REQUIRED_OFF = i18n.translate('xpack.cases.taskLists.fields.requiredOff', {
  defaultMessage: 'Optional',
});

export const REMOVE_SUBTASK = i18n.translate('xpack.cases.taskLists.fields.removeSubtask', {
  defaultMessage: 'Remove sub-task',
});

export const DRAG_HANDLE = i18n.translate('xpack.cases.taskLists.fields.dragHandle', {
  defaultMessage: 'Drag to reorder',
});

export const TASKS_HELP = i18n.translate('xpack.cases.taskLists.fields.tasksHelp', {
  defaultMessage: 'Drag tasks to change the order analysts see them in.',
});

export const TASK_MOVED = (title: string, position: number, total: number) =>
  i18n.translate('xpack.cases.taskLists.fields.taskMoved', {
    values: { title, position, total },
    defaultMessage: '{title} moved to position {position} of {total}',
  });

export const PRIORITY = i18n.translate('xpack.cases.taskLists.fields.priority', {
  defaultMessage: 'Priority',
});

export const ADD_TASK = i18n.translate('xpack.cases.taskLists.fields.addTask', {
  defaultMessage: 'Add task',
});

export const ADD_SUBTASK = i18n.translate('xpack.cases.taskLists.fields.addSubtask', {
  defaultMessage: 'Add sub-task',
});

export const REMOVE_TASK = i18n.translate('xpack.cases.taskLists.fields.removeTask', {
  defaultMessage: 'Remove task',
});

export const NAME_REQUIRED = i18n.translate('xpack.cases.taskLists.fields.nameRequired', {
  defaultMessage: 'Name is required.',
});

export const TASKS_REQUIRED = i18n.translate('xpack.cases.taskLists.fields.tasksRequired', {
  defaultMessage: 'Add at least one task with a title.',
});
