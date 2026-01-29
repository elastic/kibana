/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const MAINTENANCE_WINDOWS = i18n.translate('xpack.maintenanceWindows', {
  defaultMessage: 'Maintenance Windows',
});

export const MAINTENANCE_WINDOWS_DESCRIPTION = i18n.translate(
  'xpack.maintenanceWindows.description',
  {
    defaultMessage: 'Suppress rule notifications for scheduled periods of time.',
  }
);

export const READ_ONLY_BADGE_TEXT = i18n.translate('xpack.maintenanceWindows.badge.readOnly.text', {
  defaultMessage: 'Read only',
});

export const READ_ONLY_BADGE_TOOLTIP = i18n.translate(
  'xpack.maintenanceWindows.badge.readOnly.tooltip',
  {
    defaultMessage: 'Unable to create or edit maintenance Windows',
  }
);

export const CREATE_NEW_BUTTON = i18n.translate('xpack.maintenanceWindows.createNewButton', {
  defaultMessage: 'Create window',
});

export const EMPTY_PROMPT_BUTTON = i18n.translate('xpack.maintenanceWindows.emptyPrompt.button', {
  defaultMessage: 'Create a maintenance window',
});

export const EMPTY_PROMPT_DOCUMENTATION = i18n.translate(
  'xpack.maintenanceWindows.emptyPrompt.documentation',
  {
    defaultMessage: 'Documentation',
  }
);

export const EMPTY_PROMPT_TITLE = i18n.translate('xpack.maintenanceWindows.emptyPrompt.title', {
  defaultMessage: 'Create your first maintenance window',
});

export const EMPTY_PROMPT_DESCRIPTION = i18n.translate(
  'xpack.maintenanceWindows.emptyPrompt.description',
  {
    defaultMessage: 'Schedule a time period in which rule notifications cease.',
  }
);

export const CREATE_MAINTENANCE_WINDOW = i18n.translate(
  'xpack.maintenanceWindows.create.maintenanceWindow',
  {
    defaultMessage: 'Create maintenance window',
  }
);

export const CREATE_MAINTENANCE_WINDOW_DESCRIPTION = i18n.translate(
  'xpack.maintenanceWindows.create.description',
  {
    defaultMessage:
      'Schedule a single or recurring period in which new alerts do not send notifications.',
  }
);

export const MAINTENANCE_WINDOWS_RETURN_LINK = i18n.translate(
  'xpack.maintenanceWindows.returnLink',
  {
    defaultMessage: 'Return',
  }
);

export const NAME = i18n.translate('xpack.maintenanceWindows.name', {
  defaultMessage: 'Name',
});

export const CREATE_FORM_NAME_REQUIRED = i18n.translate(
  'xpack.maintenanceWindows.createForm.nameFieldRequiredError',
  {
    defaultMessage: 'A name is required.',
  }
);

export const CREATE_FORM_SCHEDULE = i18n.translate('xpack.maintenanceWindows.createForm.schedule', {
  defaultMessage: 'Schedule',
});

export const CREATE_FORM_SCHEDULE_INVALID = i18n.translate(
  'xpack.maintenanceWindows.createForm.scheduleInvalid',
  {
    defaultMessage: 'The end date must be greater than or equal to the start date.',
  }
);

export const CREATE_FORM_TIMEZONE = i18n.translate('xpack.maintenanceWindows.createForm.timezone', {
  defaultMessage: 'Time zone',
});

export const CREATE_FORM_REPEAT = i18n.translate('xpack.maintenanceWindows.createForm.repeat', {
  defaultMessage: 'Repeat',
});

export const CREATE_FORM_TIMEFRAME_TITLE = i18n.translate(
  'xpack.maintenanceWindows.createForm.frequency.title',
  {
    defaultMessage: 'Timeframe',
  }
);

export const CREATE_FORM_TIMEFRAME_DESCRIPTION = i18n.translate(
  'xpack.maintenanceWindows.createForm.frequency.description',
  {
    defaultMessage: 'Define the start and end time when events should be affected by the window.',
  }
);

export const CREATE_FORM_SOLUTION_SELECTION_TITLE = i18n.translate(
  'xpack.maintenanceWindows.createForm.solutionSelection.title',
  {
    defaultMessage: 'Solution specific maintenance window',
  }
);

export const CREATE_FORM_SOLUTION_SELECTION_DESCRIPTION = i18n.translate(
  'xpack.maintenanceWindows.createForm.solutionSelection.description',
  {
    defaultMessage:
      'Only rules associated with the selected solution are affected by the maintenance window.',
  }
);

export const CREATE_FORM_SOLUTION_SELECTION_CHECKBOX_GROUP_TITLE = i18n.translate(
  'xpack.maintenanceWindows.createForm.solutionSelection.checkboxGroupTitle',
  {
    defaultMessage: 'Select the solution this should affect',
  }
);

export const CREATE_FORM_SOLUTION_OBSERVABILITY_RULES = i18n.translate(
  'xpack.maintenanceWindows.createForm.solutionIds.observabilityRules',
  {
    defaultMessage: 'Observability rules',
  }
);

export const CREATE_FORM_SOLUTION_SECURITY_RULES = i18n.translate(
  'xpack.maintenanceWindows.createForm.solutionIds.securityRules',
  {
    defaultMessage: 'Security rules',
  }
);

export const CREATE_FORM_SOLUTION_STACK_RULES = i18n.translate(
  'xpack.maintenanceWindows.createForm.solutionIds.stackRules',
  {
    defaultMessage: 'Stack rules',
  }
);

export const CREATE_FORM_SCOPED_QUERY_TITLE = i18n.translate(
  'xpack.maintenanceWindows.createForm.scopedQuery.title',
  {
    defaultMessage: 'Filters',
  }
);

export const CREATE_FORM_SCOPED_QUERY_DESCRIPTION = i18n.translate(
  'xpack.maintenanceWindows.createForm.scopedQuery.description',
  {
    defaultMessage: 'Add filters that refine the scope of the maintenance window.',
  }
);

export const CREATE_FORM_SCOPED_QUERY_TOGGLE_TITLE = i18n.translate(
  'xpack.maintenanceWindows.createForm.scopedQuery.toggleTitle',
  {
    defaultMessage: 'Filter alerts',
  }
);

export const CREATE_FORM_SCOPED_QUERY_INVALID_ERROR_MESSAGE = i18n.translate(
  'xpack.maintenanceWindows.createForm.scopedQuery.invalidErrorMessage',
  {
    defaultMessage: 'Invalid scoped query.',
  }
);

export const CREATE_FORM_SCOPED_QUERY_EMPTY_ERROR_MESSAGE = i18n.translate(
  'xpack.maintenanceWindows.createForm.scopedQuery.emptyErrorMessage',
  {
    defaultMessage: 'Scoped query is required.',
  }
);

export const CREATE_FORM_RECURRING_SUMMARY_PREFIX = (summary: string) =>
  i18n.translate('xpack.maintenanceWindows.createForm.recurringSummaryPrefix', {
    defaultMessage: 'Repeats {summary}',
    values: { summary },
  });

export const CANCEL = i18n.translate('xpack.maintenanceWindows.createForm.cancel', {
  defaultMessage: 'Cancel',
});

export const TABLE_ALERTS = i18n.translate('xpack.maintenanceWindows.table.alerts', {
  defaultMessage: 'Alerts',
});

// Add this tooltip to the Alerts column heading on the MW table
export const TABLE_ALERTS_TOOLTIP = i18n.translate('xpack.maintenanceWindows.table.alertsTooltip', {
  defaultMessage: 'The total number of alerts created in the maintenance window.',
});

export const TABLE_STATUS = i18n.translate('xpack.maintenanceWindows.table.status', {
  defaultMessage: 'Status',
});

export const TABLE_STATUS_RUNNING = i18n.translate('xpack.maintenanceWindows.table.statusRunning', {
  defaultMessage: 'Running',
});

export const TABLE_STATUS_UPCOMING = i18n.translate(
  'xpack.maintenanceWindows.table.statusUpcoming',
  {
    defaultMessage: 'Upcoming',
  }
);

export const TABLE_STATUS_FINISHED = i18n.translate(
  'xpack.maintenanceWindows.table.statusFinished',
  {
    defaultMessage: 'Finished',
  }
);

export const TABLE_STATUS_ARCHIVED = i18n.translate(
  'xpack.maintenanceWindows.table.statusArchived',
  {
    defaultMessage: 'Archived',
  }
);

export const TABLE_STATUS_DISABLED = i18n.translate(
  'xpack.maintenanceWindows.table.statusDisabled',
  {
    defaultMessage: 'Disabled',
  }
);

export const TABLE_START_TIME = i18n.translate('xpack.maintenanceWindows.table.startTime', {
  defaultMessage: 'Start time',
});

export const TABLE_END_TIME = i18n.translate('xpack.maintenanceWindows.table.endTime', {
  defaultMessage: 'End time',
});

export const TABLE_ACTION_EDIT = i18n.translate('xpack.maintenanceWindows.table.edit', {
  defaultMessage: 'Edit',
});

export const EDIT_MAINTENANCE_WINDOW = i18n.translate(
  'xpack.maintenanceWindows.edit.maintenanceWindow',
  {
    defaultMessage: 'Edit maintenance window',
  }
);

export const SAVE_MAINTENANCE_WINDOW = i18n.translate(
  'xpack.maintenanceWindows.save.maintenanceWindow',
  {
    defaultMessage: 'Save maintenance window',
  }
);

export const TABLE_ACTION_CANCEL = i18n.translate('xpack.maintenanceWindows.table.cancel', {
  defaultMessage: 'Cancel',
});

export const CANCEL_MODAL_TITLE = i18n.translate('xpack.maintenanceWindows.cancelModal.title', {
  defaultMessage: 'Cancel maintenance window',
});

export const CANCEL_MODAL_SUBTITLE = i18n.translate(
  'xpack.maintenanceWindows.cancelModal.subtitle',
  {
    defaultMessage:
      'Rule notifications resume immediately. Running maintenance window events are canceled; upcoming events are unaffected.',
  }
);

export const CANCEL_MODAL_BUTTON = i18n.translate('xpack.maintenanceWindows.cancelModal.button', {
  defaultMessage: 'Keep running',
});

export const TABLE_ACTION_CANCEL_AND_ARCHIVE = i18n.translate(
  'xpack.maintenanceWindows.table.cancelAndArchive',
  {
    defaultMessage: 'Cancel and archive',
  }
);

export const CANCEL_AND_ARCHIVE_MODAL_TITLE = i18n.translate(
  'xpack.maintenanceWindows.cancelAndArchiveModal.title',
  {
    defaultMessage: 'Cancel and archive maintenance window',
  }
);

export const CANCEL_AND_ARCHIVE_MODAL_SUBTITLE = i18n.translate(
  'xpack.maintenanceWindows.cancelAndArchiveModal.subtitle',
  {
    defaultMessage:
      'Rule notifications resume immediately. All running and upcoming maintenance window events are canceled and the window is queued for deletion.',
  }
);

export const DELETE_MODAL_TITLE = i18n.translate('xpack.maintenanceWindows.deleteModal.title', {
  defaultMessage: 'Delete maintenance window',
});

export const DELETE_MODAL_SUBTITLE = i18n.translate(
  'xpack.maintenanceWindows.deleteModal.subtitle',
  {
    defaultMessage: "You won't be able to recover a deleted maintenance window.",
  }
);

export const ARCHIVE = i18n.translate('xpack.maintenanceWindows.archive', {
  defaultMessage: 'Archive',
});

export const COPY_ID = i18n.translate('xpack.maintenanceWindows.copyId', {
  defaultMessage: 'Copy ID',
});

export const COPY_ID_ACTION_SUCCESS = i18n.translate('xpack.maintenanceWindows.copyId.success', {
  defaultMessage: 'Copied maintenance window ID to clipboard',
});

export const ARCHIVE_TITLE = i18n.translate('xpack.maintenanceWindows.archive.title', {
  defaultMessage: 'Archive maintenance window',
});

export const ARCHIVE_SUBTITLE = i18n.translate('xpack.maintenanceWindows.archive.subtitle', {
  defaultMessage:
    'Upcoming maintenance window events are canceled and the window is queued for deletion.',
});

export const SOLUTION_CONFIG_REMOVAL_WARNING_TITLE = i18n.translate(
  'xpack.maintenanceWindows.solutionConfigRemovalWarning.title',
  {
    defaultMessage: 'Support for multiple solution categories is removed.',
  }
);

export const SOLUTION_CONFIG_REMOVAL_WARNING_SUBTITLE = i18n.translate(
  'xpack.maintenanceWindows.solutionConfigRemovalWarning.subtitle',
  {
    defaultMessage:
      'When you save the changes, the maintenance window will affect all rules that meet the filtering criteria.',
  }
);

export const TABLE_ACTION_UNARCHIVE = i18n.translate('xpack.maintenanceWindows.table.unarchive', {
  defaultMessage: 'Unarchive',
});

export const TABLE_ACTION_DELETE = i18n.translate('xpack.maintenanceWindows.table.delete', {
  defaultMessage: 'Delete',
});

export const UNARCHIVE_MODAL_TITLE = i18n.translate(
  'xpack.maintenanceWindows.unarchiveModal.title',
  {
    defaultMessage: 'Unarchive maintenance window',
  }
);

export const UNARCHIVE_MODAL_SUBTITLE = i18n.translate(
  'xpack.maintenanceWindows.unarchiveModal.subtitle',
  {
    defaultMessage: 'Upcoming maintenance window events are scheduled.',
  }
);

export const ARCHIVE_CALLOUT_SUBTITLE = i18n.translate(
  'xpack.maintenanceWindows.archiveCallout.subtitle',
  {
    defaultMessage:
      'Upcoming maintenance window events will be canceled, and the window will be queued for deletion. Any other changes made here will not be saved. Are you sure you want to discard changes and archive this maintenance window?',
  }
);

export const UPCOMING = i18n.translate('xpack.maintenanceWindows.upcoming', {
  defaultMessage: 'Upcoming',
});

export const UPGRADE_TO_PLATINUM = i18n.translate(
  'xpack.maintenanceWindows.licenseCallout.updgradeToPlatinumTitle',
  {
    defaultMessage: 'Maintenance windows are a subscription feature',
  }
);

export const UPGRADE_TO_PLATINUM_SUBTITLE = i18n.translate(
  'xpack.maintenanceWindows.licenseCallout.upgradeToPlatinumSubtitle',
  {
    defaultMessage: 'Select an option to unlock it.',
  }
);

export const UPGRADE_SUBSCRIPTION = i18n.translate(
  'xpack.maintenanceWindows.licenseCallout.upgradeSubscription',
  {
    defaultMessage: 'Upgrade subscription',
  }
);

export const START_TRIAL = i18n.translate('xpack.maintenanceWindows.licenseCallout.startTrial', {
  defaultMessage: 'Start trial',
});

export const REFRESH = i18n.translate('xpack.maintenanceWindows.refreshButton', {
  defaultMessage: 'Refresh',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.maintenanceWindows.searchPlaceholder', {
  defaultMessage: 'Search',
});
