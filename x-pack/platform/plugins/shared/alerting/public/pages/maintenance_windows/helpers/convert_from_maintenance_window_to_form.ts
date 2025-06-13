/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Frequency } from '@kbn/rrule';
import { has } from 'lodash';
import { getInitialByWeekday } from '@kbn/response-ops-recurring-schedule-form/utils/get_initial_by_weekday';
import type {
  RecurrenceFrequency,
  RecurringSchedule,
} from '@kbn/response-ops-recurring-schedule-form/types';
import { RecurrenceEnd } from '@kbn/response-ops-recurring-schedule-form/constants';
import type { FormProps } from '../components/schema';
import type { RRuleParams, MaintenanceWindow } from '../../../../common';

export const convertFromMaintenanceWindowToForm = (
  maintenanceWindow: MaintenanceWindow
): FormProps => {
  const startDate = maintenanceWindow.rRule.dtstart;
  const endDate = moment(startDate).add(maintenanceWindow.duration);
  // maintenance window is considered recurring if interval is defined
  const recurring = has(maintenanceWindow, 'rRule.interval');
  const hasScopedQuery = !!maintenanceWindow.scopedQuery;
  const form: FormProps = {
    title: maintenanceWindow.title,
    startDate,
    endDate: endDate.toISOString(),
    timezone: [maintenanceWindow.rRule.tzid],
    recurring,
    solutionId:
      maintenanceWindow.categoryIds && maintenanceWindow.categoryIds.length === 1 && hasScopedQuery
        ? maintenanceWindow.categoryIds[0]
        : undefined,
    scopedQuery: maintenanceWindow.scopedQuery,
  };
  if (!recurring) return form;

  const rRule = maintenanceWindow.rRule;
  const isCustomFrequency = isCustom(rRule);
  const frequency = rRule.freq as RecurrenceFrequency;
  const ends = rRule.until
    ? RecurrenceEnd.ON_DATE
    : rRule.count
    ? RecurrenceEnd.AFTER_X
    : RecurrenceEnd.NEVER;

  const recurringSchedule: RecurringSchedule = {
    frequency: isCustomFrequency ? 'CUSTOM' : frequency,
    interval: rRule.interval,
    ends,
  };

  if (isCustomFrequency) {
    recurringSchedule.customFrequency = frequency;
  }

  if (rRule.until) {
    recurringSchedule.until = rRule.until;
  }
  if (rRule.count) {
    recurringSchedule.count = rRule.count;
  }
  if (frequency !== Frequency.MONTHLY && rRule.byweekday) {
    recurringSchedule.byweekday = getInitialByWeekday(
      rRule.byweekday as string[],
      moment(startDate)
    );
  }
  if (frequency === Frequency.MONTHLY) {
    if (rRule.byweekday) {
      recurringSchedule.bymonth = 'weekday';
    } else if (rRule.bymonthday) {
      recurringSchedule.bymonth = 'day';
    }
  }

  form.recurringSchedule = recurringSchedule;

  return form;
};

const isCustom = (rRule: RRuleParams) => {
  const freq = rRule.freq;
  // interval is greater than 1
  if (rRule.interval && rRule.interval > 1) {
    return true;
  }
  // frequency is daily and no weekdays are selected
  if (freq && freq === Frequency.DAILY && !rRule.byweekday) {
    return true;
  }
  // frequency is weekly and there are multiple weekdays selected
  if (freq && freq === Frequency.WEEKLY && rRule.byweekday && rRule.byweekday.length > 1) {
    return true;
  }
  // frequency is monthly and by month day is selected
  if (freq && freq === Frequency.MONTHLY && rRule.bymonthday) {
    return true;
  }
  return false;
};
