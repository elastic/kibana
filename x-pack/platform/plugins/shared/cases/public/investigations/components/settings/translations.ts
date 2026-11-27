/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.cases.investigations.settings.pageTitle', {
  defaultMessage: 'Investigation settings',
});
export const PAGE_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.pageDescription',
  {
    defaultMessage:
      'Define the statuses your team uses to work investigations, the reasons analysts can give when they pause one, the templates that set the fields of each kind of investigation, and the task lists they add.',
  }
);
export const BACK_TO_QUEUE = i18n.translate('xpack.cases.investigations.settings.backToQueue', {
  defaultMessage: 'Back to investigations',
});
export const BACK_TO_QUEUE_ARIA = i18n.translate(
  'xpack.cases.investigations.settings.backToQueueAria',
  { defaultMessage: 'Back to the investigations queue' }
);

export const READ_ONLY_TITLE = i18n.translate('xpack.cases.investigations.settings.readOnlyTitle', {
  defaultMessage: 'You can view these settings but not change them',
});
export const READ_ONLY_BODY = i18n.translate('xpack.cases.investigations.settings.readOnlyBody', {
  defaultMessage:
    'Changing statuses and pause reasons needs the Cases settings privilege. Ask an administrator for access.',
});

export const LOADING = i18n.translate('xpack.cases.investigations.settings.loading', {
  defaultMessage: 'Loading investigation settings',
});
export const LOAD_ERROR_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.loadErrorTitle',
  { defaultMessage: 'Could not load the investigation settings' }
);

export const SAVE_ERROR_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.saveErrorTitle',
  { defaultMessage: 'Could not save the change' }
);
export const CONFLICT_ERROR_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.conflictErrorTitle',
  { defaultMessage: 'The settings changed while you were editing' }
);
export const RELOAD = i18n.translate('xpack.cases.investigations.settings.reload', {
  defaultMessage: 'Reload settings',
});
export const DISMISS = i18n.translate('xpack.cases.investigations.settings.dismiss', {
  defaultMessage: 'Dismiss',
});

/* Statuses */

export const STATUSES_TITLE = i18n.translate('xpack.cases.investigations.settings.statusesTitle', {
  defaultMessage: 'Statuses',
});
export const STATUSES_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.statusesDescription',
  {
    defaultMessage:
      'Each status belongs to one of three categories: Open, In progress, or Closed. Alerts, automations, and reports work from the category, so they keep working the way they do today. Each category has a default status, used whenever an investigation moves to that category without a more specific status.',
  }
);

export const CATEGORY_HELP = {
  open: i18n.translate('xpack.cases.investigations.settings.categoryHelpOpen', {
    defaultMessage:
      'Where new investigations start. Every new investigation gets the default status.',
  }),
  'in-progress': i18n.translate('xpack.cases.investigations.settings.categoryHelpInProgress', {
    defaultMessage:
      'Investigations someone is actively working on. The default status is applied when an investigation is taken or marked in progress.',
  }),
  closed: i18n.translate('xpack.cases.investigations.settings.categoryHelpClosed', {
    defaultMessage:
      'Finished investigations. The default status is applied when an investigation is closed, including by automations.',
  }),
} as const;

export const ENABLED_COUNT = (count: number) =>
  i18n.translate('xpack.cases.investigations.settings.enabledCount', {
    defaultMessage: '{count} enabled',
    values: { count },
  });
export const NO_ENABLED_STATUSES = i18n.translate(
  'xpack.cases.investigations.settings.noEnabledStatuses',
  { defaultMessage: 'No enabled statuses.' }
);
export const DISABLED_STATUSES = (count: number) =>
  i18n.translate('xpack.cases.investigations.settings.disabledStatuses', {
    defaultMessage: '{count, plural, one {# disabled status} other {# disabled statuses}}',
    values: { count },
  });
export const ADD_STATUS = i18n.translate('xpack.cases.investigations.settings.addStatus', {
  defaultMessage: 'Add status',
});
export const STATUS_LIMIT = (max: number, category: string) =>
  i18n.translate('xpack.cases.investigations.settings.statusLimit', {
    defaultMessage: 'You can have up to {max} statuses under {category}.',
    values: { max, category },
  });

export const PAUSES_TIME_TRACKING = i18n.translate(
  'xpack.cases.investigations.settings.pausesTimeTracking',
  { defaultMessage: 'Pauses time tracking' }
);
export const DEFAULT_FOR_CATEGORY = (category: string) =>
  i18n.translate('xpack.cases.investigations.settings.defaultForCategory', {
    defaultMessage: 'Default for {category} investigations',
    values: { category },
  });
export const DEFAULT_FOR_CATEGORY_TOOLTIP = (category: string) =>
  i18n.translate('xpack.cases.investigations.settings.defaultForCategoryTooltip', {
    defaultMessage:
      'Used whenever an investigation moves to {category} without a more specific status.',
    values: { category },
  });

export const ROW_ACTIONS_ARIA = (label: string) =>
  i18n.translate('xpack.cases.investigations.settings.rowActionsAria', {
    defaultMessage: 'Actions for {label}',
    values: { label },
  });
export const ACTION_EDIT = i18n.translate('xpack.cases.investigations.settings.actionEdit', {
  defaultMessage: 'Edit',
});
export const ACTION_SET_DEFAULT = i18n.translate(
  'xpack.cases.investigations.settings.actionSetDefault',
  { defaultMessage: 'Set as default' }
);
export const ACTION_MOVE_UP = i18n.translate('xpack.cases.investigations.settings.actionMoveUp', {
  defaultMessage: 'Move up',
});
export const ACTION_MOVE_DOWN = i18n.translate(
  'xpack.cases.investigations.settings.actionMoveDown',
  { defaultMessage: 'Move down' }
);
export const ACTION_ENABLE = i18n.translate('xpack.cases.investigations.settings.actionEnable', {
  defaultMessage: 'Enable',
});
export const ACTION_DISABLE = i18n.translate('xpack.cases.investigations.settings.actionDisable', {
  defaultMessage: 'Disable',
});
export const ACTION_REMOVE = i18n.translate('xpack.cases.investigations.settings.actionRemove', {
  defaultMessage: 'Remove',
});
export const TOOLTIP_ENABLE_FIRST = i18n.translate(
  'xpack.cases.investigations.settings.tooltipEnableFirst',
  { defaultMessage: 'Enable this status first.' }
);
export const TOOLTIP_PAUSING_NOT_DEFAULT = i18n.translate(
  'xpack.cases.investigations.settings.tooltipPausingNotDefault',
  { defaultMessage: "A status that pauses time tracking can't be the default." }
);
export const TOOLTIP_SET_ANOTHER_DEFAULT = i18n.translate(
  'xpack.cases.investigations.settings.tooltipSetAnotherDefault',
  { defaultMessage: 'Set another status as the default first.' }
);
export const TOOLTIP_NEEDS_ONE_ENABLED = i18n.translate(
  'xpack.cases.investigations.settings.tooltipNeedsOneEnabled',
  { defaultMessage: 'Each category needs at least one enabled status.' }
);

/* Status form */

export const ADD_STATUS_TITLE = (category: string) =>
  i18n.translate('xpack.cases.investigations.settings.addStatusTitle', {
    defaultMessage: 'Add status under {category}',
    values: { category },
  });
export const EDIT_STATUS_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.editStatusTitle',
  { defaultMessage: 'Edit status' }
);
export const LABEL_FIELD = i18n.translate('xpack.cases.investigations.settings.labelField', {
  defaultMessage: 'Label',
});
export const LABEL_HELP = i18n.translate('xpack.cases.investigations.settings.labelHelp', {
  defaultMessage: 'Shown on investigations, in filters, and in the activity feed.',
});
export const LABEL_REQUIRED = i18n.translate('xpack.cases.investigations.settings.labelRequired', {
  defaultMessage: 'Enter a label.',
});
export const LABEL_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.investigations.settings.labelTooLong', {
    defaultMessage: 'Labels can be up to {max} characters.',
    values: { max },
  });
export const LABEL_DUPLICATE = (category: string) =>
  i18n.translate('xpack.cases.investigations.settings.labelDuplicate', {
    defaultMessage: 'A status with this label already exists under {category}.',
    values: { category },
  });
export const API_VALUE_FIELD = i18n.translate('xpack.cases.investigations.settings.apiValueField', {
  defaultMessage: 'API value',
});
export const API_VALUE_HELP = i18n.translate('xpack.cases.investigations.settings.apiValueHelp', {
  defaultMessage: 'Use this key when setting status_key through the API. It cannot be changed.',
});
export const PAUSES_HELP = i18n.translate('xpack.cases.investigations.settings.pausesHelp', {
  defaultMessage:
    "Time an investigation spends in this status is left out of its age, time to investigate, time to resolve, and the team's MTTR.",
});
export const PAUSES_DEFAULT_HELP = i18n.translate(
  'xpack.cases.investigations.settings.pausesDefaultHelp',
  { defaultMessage: "The default status can't pause time tracking." }
);
export const SAVE = i18n.translate('xpack.cases.investigations.settings.save', {
  defaultMessage: 'Save',
});
export const CANCEL = i18n.translate('xpack.cases.investigations.settings.cancel', {
  defaultMessage: 'Cancel',
});
export const CLOSE_FLYOUT_ARIA = i18n.translate(
  'xpack.cases.investigations.settings.closeFlyoutAria',
  { defaultMessage: 'Close' }
);

/* On hold callout */

export const ON_HOLD_LABEL = i18n.translate('xpack.cases.investigations.settings.onHoldLabel', {
  defaultMessage: 'On hold',
});
export const ON_HOLD_TITLE = i18n.translate('xpack.cases.investigations.settings.onHoldTitle', {
  defaultMessage: 'Need to park investigations while you wait on someone?',
});
export const ON_HOLD_BODY = i18n.translate('xpack.cases.investigations.settings.onHoldBody', {
  defaultMessage: 'Add an On hold status that pauses time tracking. You can rename it later.',
});
export const ADD_ON_HOLD = i18n.translate('xpack.cases.investigations.settings.addOnHold', {
  defaultMessage: 'Add On hold status',
});

/* Pause reasons */

export const PAUSE_REASONS_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.pauseReasonsTitle',
  { defaultMessage: 'Pause reasons' }
);
export const PAUSE_REASONS_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.pauseReasonsDescription',
  {
    defaultMessage:
      'Analysts pick one of these when they move an investigation to a status that pauses time tracking.',
  }
);
export const ADD_REASON = i18n.translate('xpack.cases.investigations.settings.addReason', {
  defaultMessage: 'Add reason',
});
export const REASON_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.investigations.settings.reasonLimit', {
    defaultMessage: 'You can have up to {max} pause reasons.',
    values: { max },
  });
export const ADD_REASON_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.addReasonTitle',
  { defaultMessage: 'Add pause reason' }
);
export const EDIT_REASON_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.editReasonTitle',
  { defaultMessage: 'Edit pause reason' }
);
export const REASON_FIELD = i18n.translate('xpack.cases.investigations.settings.reasonField', {
  defaultMessage: 'Reason',
});
export const REASON_REQUIRED = i18n.translate(
  'xpack.cases.investigations.settings.reasonRequired',
  {
    defaultMessage: 'Enter a reason.',
  }
);
export const REASON_DUPLICATE = i18n.translate(
  'xpack.cases.investigations.settings.reasonDuplicate',
  { defaultMessage: 'This reason already exists.' }
);
export const REASON_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.investigations.settings.reasonTooLong', {
    defaultMessage: 'Reasons can be up to {max} characters.',
    values: { max },
  });
export const REASON_ACTIONS_ARIA = (reason: string) =>
  i18n.translate('xpack.cases.investigations.settings.reasonActionsAria', {
    defaultMessage: 'Actions for the reason {reason}',
    values: { reason },
  });
export const REMOVE_LAST_REASON = i18n.translate(
  'xpack.cases.investigations.settings.removeLastReason',
  {
    defaultMessage: 'Add another reason first, or turn off pausing on every status.',
  }
);
export const REMOVE_REASON_TITLE = (reason: string) =>
  i18n.translate('xpack.cases.investigations.settings.removeReasonTitle', {
    defaultMessage: 'Remove the reason "{reason}"?',
    values: { reason },
  });
export const REMOVE_REASON_BODY = i18n.translate(
  'xpack.cases.investigations.settings.removeReasonBody',
  {
    defaultMessage:
      'Analysts can no longer pick it. Investigations already paused for this reason keep it.',
  }
);
export const NO_REASONS = i18n.translate('xpack.cases.investigations.settings.noReasons', {
  defaultMessage: 'No pause reasons yet.',
});

/* Tabs */
export const TAB_STATUSES = i18n.translate('xpack.cases.investigations.settings.tabStatuses', {
  defaultMessage: 'Statuses',
});
export const TAB_TEMPLATES = i18n.translate('xpack.cases.investigations.settings.tabTemplates', {
  defaultMessage: 'Investigation templates',
});
export const TABS_ARIA = i18n.translate('xpack.cases.investigations.settings.tabsAria', {
  defaultMessage: 'Investigation settings sections',
});

/* Investigation templates */
export const TEMPLATES_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.templatesTitle',
  {
    defaultMessage: 'Investigation templates',
  }
);
export const TEMPLATES_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.templatesDescription',
  {
    defaultMessage:
      'A template sets the fields an investigation collects and the task lists it starts with. Analysts pick a template when they create an investigation or apply one to an existing investigation.',
  }
);
export const TEMPLATES_LOADING = i18n.translate(
  'xpack.cases.investigations.settings.templatesLoading',
  { defaultMessage: 'Loading investigation templates' }
);
export const TEMPLATES_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.templatesLoadError',
  { defaultMessage: 'Could not load the investigation templates' }
);
export const TEMPLATES_TABLE_CAPTION = i18n.translate(
  'xpack.cases.investigations.settings.templatesTableCaption',
  { defaultMessage: 'Investigation templates' }
);
export const TEMPLATES_EMPTY_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.templatesEmptyTitle',
  { defaultMessage: 'No investigation templates yet' }
);
export const TEMPLATES_EMPTY_BODY = i18n.translate(
  'xpack.cases.investigations.settings.templatesEmptyBody',
  {
    defaultMessage:
      'Create a template so analysts can choose what kind of investigation they are starting.',
  }
);
export const TEMPLATES_NO_PERMISSION = i18n.translate(
  'xpack.cases.investigations.settings.templatesNoPermission',
  {
    defaultMessage:
      'Creating and changing templates needs the Cases templates privilege. Ask an administrator for access.',
  }
);
export const CREATE_TEMPLATE = i18n.translate(
  'xpack.cases.investigations.settings.createTemplate',
  {
    defaultMessage: 'Create template',
  }
);
export const COLUMN_NAME = i18n.translate('xpack.cases.investigations.settings.columnName', {
  defaultMessage: 'Name',
});
export const COLUMN_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.columnDescription',
  { defaultMessage: 'Description' }
);
export const COLUMN_FIELDS = i18n.translate('xpack.cases.investigations.settings.columnFields', {
  defaultMessage: 'Fields',
});
export const COLUMN_VERSION = i18n.translate('xpack.cases.investigations.settings.columnVersion', {
  defaultMessage: 'Version',
});
export const COLUMN_ENABLED = i18n.translate('xpack.cases.investigations.settings.columnEnabled', {
  defaultMessage: 'Enabled',
});
export const COLUMN_ACTIONS = i18n.translate('xpack.cases.investigations.settings.columnActions', {
  defaultMessage: 'Actions',
});
export const NO_DESCRIPTION = i18n.translate('xpack.cases.investigations.settings.noDescription', {
  defaultMessage: 'No description',
});
export const VERSION_VALUE = (version: number) =>
  i18n.translate('xpack.cases.investigations.settings.versionValue', {
    defaultMessage: 'v{version}',
    values: { version },
  });
export const ENABLED_BADGE = i18n.translate('xpack.cases.investigations.settings.enabledBadge', {
  defaultMessage: 'Enabled',
});
export const DISABLED_BADGE = i18n.translate('xpack.cases.investigations.settings.disabledBadge', {
  defaultMessage: 'Disabled',
});
export const EDIT_TEMPLATE = i18n.translate('xpack.cases.investigations.settings.editTemplate', {
  defaultMessage: 'Edit template',
});
export const EDIT_TEMPLATE_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.editTemplateAria', {
    defaultMessage: 'Edit the template {name}',
    values: { name },
  });
export const DISABLE_TEMPLATE = i18n.translate(
  'xpack.cases.investigations.settings.disableTemplate',
  { defaultMessage: 'Disable' }
);
export const ENABLE_TEMPLATE = i18n.translate(
  'xpack.cases.investigations.settings.enableTemplate',
  {
    defaultMessage: 'Enable',
  }
);
export const DISABLE_TEMPLATE_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.disableTemplateAria', {
    defaultMessage: 'Disable the template {name}',
    values: { name },
  });
export const ENABLE_TEMPLATE_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.enableTemplateAria', {
    defaultMessage: 'Enable the template {name}',
    values: { name },
  });
export const DISABLE_TEMPLATE_TITLE = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.disableTemplateTitle', {
    defaultMessage: 'Disable the template "{name}"?',
    values: { name },
  });
export const DISABLE_TEMPLATE_BODY = i18n.translate(
  'xpack.cases.investigations.settings.disableTemplateBody',
  {
    defaultMessage:
      'Analysts can no longer choose it for new investigations. Investigations that already use it keep their fields and task list.',
  }
);
export const TEMPLATE_DISABLED_TOAST = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.templateDisabledToast', {
    defaultMessage: 'Disabled the template {name}.',
    values: { name },
  });
export const TEMPLATE_ENABLED_TOAST = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.templateEnabledToast', {
    defaultMessage: 'Enabled the template {name}.',
    values: { name },
  });
export const TEMPLATE_TOGGLE_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.templateToggleError',
  { defaultMessage: 'Could not change the template' }
);

/* Create and edit a template */
export const BACK_TO_TEMPLATES = i18n.translate(
  'xpack.cases.investigations.settings.backToTemplates',
  { defaultMessage: 'Investigation templates' }
);
export const NEW_TEMPLATE_BREADCRUMB = i18n.translate(
  'xpack.cases.investigations.settings.newTemplateBreadcrumb',
  { defaultMessage: 'New template' }
);
export const NO_TEMPLATE_PERMISSION_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.noTemplatePermissionTitle',
  { defaultMessage: 'You cannot create or change templates' }
);
export const TEMPLATE_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.templateLoadError',
  { defaultMessage: 'Could not load the template' }
);
export const TEMPLATE_NOT_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.settings.templateNotInvestigation',
  { defaultMessage: 'This template is not an investigation template.' }
);

/* Task list */
export const GLOBAL_FIELDS_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.globalFieldsDescription',
  {
    defaultMessage:
      "Global fields apply to every investigation, whether or not a template is applied. They are listed before the template's fields. Drag to reorder them.",
  }
);
export const GLOBAL_FIELDS_LOADING = i18n.translate(
  'xpack.cases.investigations.settings.globalFieldsLoading',
  { defaultMessage: 'Loading the global fields' }
);
export const GLOBAL_FIELDS_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.globalFieldsLoadError',
  { defaultMessage: 'Could not load the global fields' }
);
export const GLOBAL_FIELDS_EMPTY_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.globalFieldsEmptyTitle',
  { defaultMessage: 'No global fields yet' }
);
export const GLOBAL_FIELDS_EMPTY_BODY = i18n.translate(
  'xpack.cases.investigations.settings.globalFieldsEmptyBody',
  {
    defaultMessage:
      'Create a global field to ask for the same information on every investigation, whatever its template.',
  }
);
export const GLOBAL_FIELDS_NO_PERMISSION = i18n.translate(
  'xpack.cases.investigations.settings.globalFieldsNoPermission',
  { defaultMessage: 'You can view the global fields but not change them.' }
);

/* Task lists */

export const TAB_TASK_LISTS = i18n.translate('xpack.cases.investigations.settings.tabTaskLists', {
  defaultMessage: 'Task lists',
});
export const TASK_LISTS_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.taskListsTitle',
  { defaultMessage: 'Task lists' }
);
export const TASK_LISTS_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.taskListsDescription',
  {
    defaultMessage:
      'Reusable checklists analysts can apply to an investigation. Reference a task list from a template to add its tasks when an investigation is created.',
  }
);
export const ADD_TASK_LIST = i18n.translate('xpack.cases.investigations.settings.addTaskList', {
  defaultMessage: 'Add task list',
});
export const TASK_LISTS_EMPTY = i18n.translate(
  'xpack.cases.investigations.settings.taskListsEmpty',
  {
    defaultMessage: 'No task lists yet. Add one to reuse a checklist across investigations.',
  }
);
export const TASK_LISTS_LOADING = i18n.translate(
  'xpack.cases.investigations.settings.taskListsLoading',
  { defaultMessage: 'Loading task lists' }
);
export const TASK_LISTS_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.taskListsLoadError',
  { defaultMessage: 'Could not load the task lists' }
);
export const TASK_LISTS_TABLE_CAPTION = i18n.translate(
  'xpack.cases.investigations.settings.taskListsTableCaption',
  { defaultMessage: 'Task lists' }
);
export const TASK_LISTS_MAX = (max: number) =>
  i18n.translate('xpack.cases.investigations.settings.taskListsMax', {
    defaultMessage: 'You have reached the maximum of {max} task lists.',
    values: { max },
  });
export const TASK_LISTS_READ_ONLY = i18n.translate(
  'xpack.cases.investigations.settings.taskListsReadOnly',
  {
    defaultMessage:
      'Adding, changing and deleting task lists needs the Cases settings privilege. Ask an administrator for access.',
  }
);
export const COLUMN_TAGS = i18n.translate('xpack.cases.investigations.settings.columnTags', {
  defaultMessage: 'Tags',
});
export const COLUMN_TASK_COUNT = i18n.translate(
  'xpack.cases.investigations.settings.columnTaskCount',
  { defaultMessage: 'Tasks' }
);
export const COLUMN_USED_BY = i18n.translate('xpack.cases.investigations.settings.columnUsedBy', {
  defaultMessage: 'Used by templates',
});
export const COLUMN_UPDATED = i18n.translate('xpack.cases.investigations.settings.columnUpdated', {
  defaultMessage: 'Updated',
});
export const NOT_USED = i18n.translate('xpack.cases.investigations.settings.notUsed', {
  defaultMessage: 'No template',
});
export const NO_TAGS = i18n.translate('xpack.cases.investigations.settings.noTags', {
  defaultMessage: 'No tags',
});
export const TASK_COUNT = (count: number) =>
  i18n.translate('xpack.cases.investigations.settings.taskCount', {
    defaultMessage: '{count, plural, one {# task} other {# tasks}}',
    values: { count },
  });
export const EDIT_TASK_LIST = i18n.translate('xpack.cases.investigations.settings.editTaskList', {
  defaultMessage: 'Edit',
});
export const EDIT_TASK_LIST_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.editTaskListAria', {
    defaultMessage: 'Edit the task list {name}',
    values: { name },
  });
export const DELETE_TASK_LIST = i18n.translate(
  'xpack.cases.investigations.settings.deleteTaskList',
  { defaultMessage: 'Delete' }
);
export const DELETE_TASK_LIST_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.deleteTaskListAria', {
    defaultMessage: 'Delete the task list {name}',
    values: { name },
  });
export const DELETE_TASK_LIST_TITLE = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.deleteTaskListTitle', {
    defaultMessage: 'Delete task list "{name}"?',
    values: { name },
  });
export const DELETE_TASK_LIST_BODY = i18n.translate(
  'xpack.cases.investigations.settings.deleteTaskListBody',
  {
    defaultMessage:
      "Templates that reference this task list stop adding its tasks. Tasks already added to investigations are kept. This can't be undone.",
  }
);
export const TASK_LIST_DELETED = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.taskListDeleted', {
    defaultMessage: 'Deleted the task list {name}.',
    values: { name },
  });
export const TASK_LIST_DELETE_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.taskListDeleteError',
  { defaultMessage: 'Could not delete the task list' }
);

/* Task list editor */

export const EDITOR_ADD_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.editorAddTitle',
  { defaultMessage: 'Add task list' }
);
export const EDITOR_EDIT_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.editorEditTitle',
  { defaultMessage: 'Edit task list' }
);
export const EDITOR_HINT = i18n.translate('xpack.cases.investigations.settings.editorHint', {
  defaultMessage:
    'The tasks this list adds to an investigation. A template that references the list adds them when an investigation is created, and analysts can apply the list from the Procedure tab.',
});
export const FIELD_NAME = i18n.translate('xpack.cases.investigations.settings.fieldName', {
  defaultMessage: 'Name',
});
export const NAME_REQUIRED = i18n.translate('xpack.cases.investigations.settings.nameRequired', {
  defaultMessage: 'Name is required.',
});
export const NAME_TOO_LONG = i18n.translate('xpack.cases.investigations.settings.nameTooLong', {
  defaultMessage: 'Use 160 characters or fewer.',
});
export const FIELD_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.fieldDescription',
  { defaultMessage: 'Description' }
);
export const DESCRIPTION_TOO_LONG = i18n.translate(
  'xpack.cases.investigations.settings.descriptionTooLong',
  { defaultMessage: 'Use 30,000 characters or fewer.' }
);
export const FIELD_TAGS = i18n.translate('xpack.cases.investigations.settings.fieldTags', {
  defaultMessage: 'Tags',
});
export const TAGS_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.settings.tagsPlaceholder',
  { defaultMessage: 'Add a tag and press Enter' }
);
export const TAGS_TOO_MANY = (max: number) =>
  i18n.translate('xpack.cases.investigations.settings.tagsTooMany', {
    defaultMessage: 'Use up to {max} tags.',
    values: { max },
  });
export const FIELD_TASKS = i18n.translate('xpack.cases.investigations.settings.fieldTasks', {
  defaultMessage: 'Tasks',
});
export const TASKS_REQUIRED = i18n.translate('xpack.cases.investigations.settings.tasksRequired', {
  defaultMessage: 'Add at least one task with a title.',
});
export const TASK_LIST_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.cases.investigations.settings.taskListUnavailableTitle',
  { defaultMessage: 'This task list no longer exists' }
);
export const TASK_LIST_UNAVAILABLE_BODY = i18n.translate(
  'xpack.cases.investigations.settings.taskListUnavailableBody',
  { defaultMessage: 'It may have been deleted. Go back to the task lists to pick another.' }
);

/* Task lists of a template */

export const COLUMN_TASK_LISTS = i18n.translate(
  'xpack.cases.investigations.settings.columnTaskLists',
  { defaultMessage: 'Task lists' }
);
export const NO_LINKED_TASK_LISTS = i18n.translate(
  'xpack.cases.investigations.settings.noLinkedTaskLists',
  { defaultMessage: 'None' }
);
export const TASK_LISTS_BUTTON = i18n.translate(
  'xpack.cases.investigations.settings.taskListsButton',
  { defaultMessage: 'Task lists…' }
);
export const TASK_LISTS_BUTTON_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.taskListsButtonAria', {
    defaultMessage: 'Choose the task lists of the template {name}',
    values: { name },
  });
export const PICKER_TITLE = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.pickerTitle', {
    defaultMessage: 'Task lists for {name}',
    values: { name },
  });
export const PICKER_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.settings.pickerDescription',
  {
    defaultMessage:
      'An investigation created with this template gets the tasks of these task lists, in this order.',
  }
);
export const PICKER_LINKED = (count: number, max: number) =>
  i18n.translate('xpack.cases.investigations.settings.pickerLinked', {
    defaultMessage: 'Added to new investigations ({count} of {max})',
    values: { count, max },
  });
export const PICKER_NONE_LINKED = i18n.translate(
  'xpack.cases.investigations.settings.pickerNoneLinked',
  { defaultMessage: 'No task lists selected. New investigations start without tasks.' }
);
export const PICKER_AVAILABLE = i18n.translate(
  'xpack.cases.investigations.settings.pickerAvailable',
  { defaultMessage: 'Other task lists' }
);
export const PICKER_NONE_AVAILABLE = i18n.translate(
  'xpack.cases.investigations.settings.pickerNoneAvailable',
  { defaultMessage: 'Every task list is selected.' }
);
export const PICKER_MAX = (max: number) =>
  i18n.translate('xpack.cases.investigations.settings.pickerMax', {
    defaultMessage: 'A template can have up to {max} task lists.',
    values: { max },
  });
export const PICKER_ADD = i18n.translate('xpack.cases.investigations.settings.pickerAdd', {
  defaultMessage: 'Add',
});
export const PICKER_ADD_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.pickerAddAria', {
    defaultMessage: 'Add the task list {name}',
    values: { name },
  });
export const PICKER_REMOVE_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.pickerRemoveAria', {
    defaultMessage: 'Remove the task list {name}',
    values: { name },
  });
export const PICKER_MOVE_UP_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.pickerMoveUpAria', {
    defaultMessage: 'Move the task list {name} up',
    values: { name },
  });
export const PICKER_MOVE_DOWN_ARIA = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.pickerMoveDownAria', {
    defaultMessage: 'Move the task list {name} down',
    values: { name },
  });
export const PICKER_CREATE = i18n.translate('xpack.cases.investigations.settings.pickerCreate', {
  defaultMessage: 'Create task list',
});
export const PICKER_SAVE = i18n.translate('xpack.cases.investigations.settings.pickerSave', {
  defaultMessage: 'Save task lists',
});
export const PICKER_SAVED = (name: string) =>
  i18n.translate('xpack.cases.investigations.settings.pickerSaved', {
    defaultMessage: 'Saved the task lists of {name}.',
    values: { name },
  });
export const PICKER_SAVE_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.pickerSaveError',
  { defaultMessage: 'The task lists could not be saved' }
);
export const PICKER_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.settings.pickerLoadError',
  { defaultMessage: 'The task lists could not be loaded' }
);
export const TEMPLATE_TASK_LISTS_HELP = i18n.translate(
  'xpack.cases.investigations.settings.templateTaskListsHelp',
  { defaultMessage: 'Task lists added to a new investigation that uses this template.' }
);
export const TASK_LISTS_UNAVAILABLE = i18n.translate(
  'xpack.cases.investigations.settings.taskListsUnavailable',
  { defaultMessage: 'Not available while the template is disabled' }
);
