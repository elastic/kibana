/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SnoozeUnit } from './constants';

export const MINUTES = i18n.translate('xpack.triggersActionsUI.sections.rulesList.minutesLabel', {
  defaultMessage: 'minutes',
});
export const HOURS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.hoursLabel', {
  defaultMessage: 'hours',
});
export const DAYS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.daysLabel', {
  defaultMessage: 'days',
});
export const WEEKS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.weeksLabel', {
  defaultMessage: 'weeks',
});
export const MONTHS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.monthsLabel', {
  defaultMessage: 'months',
});

// i18n constants to override moment.humanize
export const ONE: Record<SnoozeUnit, string> = {
  m: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneMinute', {
    defaultMessage: '1 minute',
  }),
  h: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneHour', {
    defaultMessage: '1 hour',
  }),
  d: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneDay', {
    defaultMessage: '1 day',
  }),
  w: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneWeek', {
    defaultMessage: '1 week',
  }),
  M: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneMonth', {
    defaultMessage: '1 month',
  }),
};
