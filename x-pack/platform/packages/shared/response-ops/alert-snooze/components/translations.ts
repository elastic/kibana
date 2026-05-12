/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNIT_MINUTES = i18n.translate('responseOpsAlertSnooze.quickSnoozePanel.unitMinutes', {
  defaultMessage: 'Minutes',
});
export const UNIT_HOURS = i18n.translate('responseOpsAlertSnooze.quickSnoozePanel.unitHours', {
  defaultMessage: 'Hours',
});
export const UNIT_DAYS = i18n.translate('responseOpsAlertSnooze.quickSnoozePanel.unitDays', {
  defaultMessage: 'Days',
});
export const UNIT_WEEKS = i18n.translate('responseOpsAlertSnooze.quickSnoozePanel.unitWeeks', {
  defaultMessage: 'Weeks',
});
export const UNIT_MONTHS = i18n.translate('responseOpsAlertSnooze.quickSnoozePanel.unitMonths', {
  defaultMessage: 'Months',
});

export const DURATION_INDEFINITELY = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.indefinitely',
  { defaultMessage: 'Indefinitely' }
);
export const DURATION_CUSTOM = i18n.translate('responseOpsAlertSnooze.quickSnoozePanel.custom', {
  defaultMessage: 'Custom',
});

export const CUSTOM_MODE_DURATION = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.customModeDuration',
  { defaultMessage: 'Duration' }
);
export const CUSTOM_MODE_DATETIME = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.customModeDatetime',
  { defaultMessage: 'Date & time' }
);

export const DURATION_QUESTION = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.durationQuestion',
  { defaultMessage: 'How long should this alert be snoozed?' }
);
export const DURATION_LEGEND = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.durationLegend',
  { defaultMessage: 'Snooze duration' }
);
export const CUSTOM_MODE_LEGEND = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.customModeLegend',
  { defaultMessage: 'Custom snooze mode' }
);
export const CUSTOM_VALUE_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.customValueAriaLabel',
  { defaultMessage: 'Custom snooze duration value' }
);
export const CUSTOM_UNIT_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.customUnitAriaLabel',
  { defaultMessage: 'Custom snooze duration unit' }
);
export const PAST_DATETIME_ERROR = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.pastDateTimeError',
  { defaultMessage: 'Cannot snooze an alert for a past date or time.' }
);
export const INVALID_DURATION_ERROR = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.invalidDurationError',
  { defaultMessage: 'Duration must be a whole number of at least 1.' }
);
export const CLEAR_DATETIME_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.clearDatetimeAriaLabel',
  { defaultMessage: 'Clear date and time' }
);
export const INDEFINITELY_MESSAGE = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.indefinitelyMessage',
  { defaultMessage: 'Alert will be snoozed indefinitely or until manual unsnooze.' }
);
export const getUnsnoozeOnDateMessage = (date: string) =>
  i18n.translate('responseOpsAlertSnooze.quickSnoozePanel.unsnoozeMessage', {
    defaultMessage: 'Alert will unsnooze on {date}',
    values: { date },
  });
export const SNOOZE_BUTTON = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.snoozeButton',
  { defaultMessage: 'Snooze alert' }
);
export const QUICK_SNOOZE_POPOVER_SUBTITLE = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePopover.subtitle',
  { defaultMessage: 'Silence actions immediately or schedule downtime and conditions.' }
);
export const QUICK_SNOOZE_POPOVER_APPLY = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePopover.apply',
  { defaultMessage: 'Apply' }
);

export const PANEL_TITLE = i18n.translate('responseOpsAlertSnooze.alertSnoozePanel.title', {
  defaultMessage: 'Snooze notifications',
});
export const PANEL_SUBTITLE = i18n.translate('responseOpsAlertSnooze.alertSnoozePanel.subtitle', {
  defaultMessage: 'Silence actions immediately or schedule downtimes.',
});
export const SNOOZE_TYPE_LEGEND = i18n.translate(
  'responseOpsAlertSnooze.alertSnoozePanel.snoozeTypeLegend',
  { defaultMessage: 'Snooze type' }
);
export const QUICK_SNOOZE_TAB = i18n.translate('responseOpsAlertSnooze.alertSnoozePanel.quickTab', {
  defaultMessage: 'Quick Snooze',
});
export const CONDITIONAL_SNOOZE_TAB = i18n.translate(
  'responseOpsAlertSnooze.alertSnoozePanel.conditionalTab',
  { defaultMessage: 'Conditional Snooze' }
);
