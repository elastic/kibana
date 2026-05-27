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
export const SELECT_DATE_AND_TIME = i18n.translate(
  'responseOpsAlertSnooze.quickSnoozePanel.selectDateTime',
  { defaultMessage: 'Select a date and time' }
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

// ConditionalSnoozePanel
export const CONDITIONS_HEADER = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionsHeader',
  { defaultMessage: 'Alert is snoozed until conditions are met:' }
);
export const ADD_TIME_CONDITION = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.addTimeCondition',
  { defaultMessage: 'Add time condition' }
);
export const ADD_DATA_CONDITION = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.addDataCondition',
  { defaultMessage: 'Add data condition' }
);
export const TIME_CONDITION_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.timeConditionLabel',
  { defaultMessage: 'Time condition' }
);
export const DATA_CONDITION_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.dataConditionLabel',
  { defaultMessage: 'Data condition' }
);
export const CONDITIONS_FOOTER_HINT = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionsFooterHint',
  { defaultMessage: 'Add conditions to define when the alert will un-snooze.' }
);
export const CONFIRM_CONDITION_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.confirmConditionAriaLabel',
  { defaultMessage: 'Confirm condition' }
);
export const REMOVE_TIME_CONDITION_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.removeTimeConditionAriaLabel',
  { defaultMessage: 'Remove time condition' }
);
export const REMOVE_DATA_CONDITION_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.removeDataConditionAriaLabel',
  { defaultMessage: 'Remove data condition' }
);
export const EDIT_DATA_CONDITION_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.editDataConditionAriaLabel',
  { defaultMessage: 'Edit data condition' }
);
export const EDIT_TIME_CONDITION_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.editTimeConditionAriaLabel',
  { defaultMessage: 'Edit time condition' }
);
export const SNOOZE_UNTIL_CHIP_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.snoozeUntilChipLabel',
  { defaultMessage: 'Snooze until' }
);
export const getAfterDurationLabel = (value: number, unitLabel: string) =>
  i18n.translate('responseOpsAlertSnooze.conditionalSnoozePanel.afterDurationLabel', {
    defaultMessage: 'After {value} {unitLabel}',
    values: { value, unitLabel },
  });
export const CONDITION_FIELD_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionFieldAriaLabel',
  { defaultMessage: 'Condition field' }
);
export const CONDITION_OPERATOR_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionOperatorAriaLabel',
  { defaultMessage: 'Condition operator' }
);
export const CONDITION_VALUE_PLACEHOLDER = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionValuePlaceholder',
  { defaultMessage: 'Value' }
);
export const FIELD_NAME_PLACEHOLDER = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.fieldNamePlaceholder',
  { defaultMessage: 'Field name' }
);
export const CONDITION_VALUE_ARIA_LABEL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionValueAriaLabel',
  { defaultMessage: 'Condition value' }
);
export const CONDITION_TYPE_FIELD_CHANGE = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionTypeFieldChange',
  { defaultMessage: 'Field change' }
);
export const CONDITION_TYPE_SEVERITY_CHANGE = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionTypeSeverityChange',
  { defaultMessage: 'Severity change' }
);
export const CONDITION_TYPE_SEVERITY_EQUALS = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conditionTypeSeverityEquals',
  { defaultMessage: 'Severity equals' }
);
export const SEVERITY_CRITICAL = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.severityCritical',
  { defaultMessage: 'Critical' }
);
export const SEVERITY_HIGH = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.severityHigh',
  { defaultMessage: 'High' }
);
export const SEVERITY_MEDIUM = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.severityMedium',
  { defaultMessage: 'Medium' }
);
export const SEVERITY_LOW = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.severityLow',
  { defaultMessage: 'Low' }
);
export const SEVERITY_INFO = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.severityInfo',
  { defaultMessage: 'Info' }
);
export const CONDITIONAL_OPERATOR = (operator: string) =>
  i18n.translate('responseOpsAlertSnooze.conditionalSnoozePanel.operator', {
    defaultMessage: operator,
  });
export const LOGICAL_SEPARATOR = (separator: string) =>
  i18n.translate('responseOpsAlertSnooze.conditionalSnoozePanel.logicalSeparator', {
    defaultMessage: separator.toUpperCase(),
  });
export const PREVIEW_CONNECTOR_OR = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.previewConnectorOr',
  { defaultMessage: 'or' }
);
export const PREVIEW_CONNECTOR_AND = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.previewConnectorAnd',
  { defaultMessage: 'and' }
);
export const getPreviewFieldChange = (field: string) =>
  i18n.translate('responseOpsAlertSnooze.conditionalSnoozePanel.previewFieldChange', {
    defaultMessage: 'field "{field}" is changed',
    values: { field },
  });
export const PREVIEW_SEVERITY_CHANGE = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.previewSeverityChange',
  { defaultMessage: 'severity is changed' }
);
export const getPreviewSeverityEquals = (value: string) =>
  i18n.translate('responseOpsAlertSnooze.conditionalSnoozePanel.previewSeverityEquals', {
    defaultMessage: 'severity equals {value}',
    values: { value },
  });
export const getPreviewAfterDate = (date: string) =>
  i18n.translate('responseOpsAlertSnooze.conditionalSnoozePanel.previewAfterDate', {
    defaultMessage: 'it is after {date}',
    values: { date },
  });
export const getUnsnoozeIfConditionsMessage = (conditions: string) =>
  i18n.translate('responseOpsAlertSnooze.conditionalSnoozePanel.unsnoozeIfConditionsMessage', {
    defaultMessage: 'Alert will unsnooze if {conditions}.',
    values: { conditions },
  });
export const getUnsnoozeIfConditionsOrOnDateMessage = (conditions: string, date: string) =>
  i18n.translate(
    'responseOpsAlertSnooze.conditionalSnoozePanel.unsnoozeIfConditionsOrOnDateMessage',
    {
      defaultMessage: 'Alert will unsnooze if {conditions}, OR on {date}.',
      values: { conditions, date },
    }
  );
export const CONFLICTING_SEVERITY_EQUALS_WARNING = i18n.translate(
  'responseOpsAlertSnooze.conditionalSnoozePanel.conflictingSeverityEqualsWarning',
  {
    defaultMessage:
      'Multiple "Severity equals" conditions with ALL can never be true at the same time. Switch to ANY or remove the duplicates.',
  }
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
  { defaultMessage: 'Condition based' }
);
export const SNOOZE_ALERT_BUTTON = i18n.translate(
  'responseOpsAlertSnooze.alertSnoozePopover.snoozeAlertButton',
  { defaultMessage: 'Snooze alert' }
);
export const SNOOZE_TRIGGER_BUTTON = i18n.translate(
  'responseOpsAlertSnooze.alertSnoozePopover.triggerButton',
  { defaultMessage: 'Snooze' }
);
