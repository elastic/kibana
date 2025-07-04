/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { JOB_STATUS } from '@kbn/reporting-common';
import { Job } from '@kbn/reporting-public';
import type { Rrule } from '@kbn/task-manager-plugin/server/task';
import { Frequency } from '@kbn/rrule';
import type {
  RecurrenceFrequency,
  RecurringSchedule,
} from '@kbn/response-ops-recurring-schedule-form/types';
import {
  RRULE_TO_ISO_WEEKDAYS,
  RecurrenceEnd,
} from '@kbn/response-ops-recurring-schedule-form/constants';
import { ScheduledReportApiJSON } from '@kbn/reporting-common/types';
import type { ScheduledReport } from '../types';

/**
 * This is not the most forward-compatible way of mapping to an {@link IconType} for an application.
 *
 * Ideally apps using reporting should send some metadata for the icon type they want - this is how
 * the saved objects management UI handles icons at the moment.
 */
export const guessAppIconTypeFromObjectType = (type: string): IconType => {
  switch (type) {
    case 'search':
      return 'discoverApp';
    case 'dashboard':
      return 'dashboardApp';
    case 'visualization':
      return 'visualizeApp';
    case 'canvas workpad':
      return 'canvasApp';
    case 'lens':
      return 'lensApp';
    default:
      return 'apps';
  }
};

export const getDisplayNameFromObjectType = (type: string): string => {
  switch (type) {
    case 'search':
      return 'discover session';
    default:
      return type;
  }
};

export const jobHasIssues = (job: Job): boolean => {
  return (
    Boolean(job.getWarnings()) ||
    [JOB_STATUS.WARNINGS, JOB_STATUS.FAILED].some((status) => job.status === status)
  );
};

const isCustomRrule = (rRule: Rrule) => {
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

export const transformScheduledReport = (report: ScheduledReportApiJSON): ScheduledReport => {
  const { title, schedule, notification } = report;
  const rRule = schedule.rrule;

  const isCustomFrequency = isCustomRrule(rRule);
  const frequency = rRule.freq as RecurrenceFrequency;

  const recurringSchedule: RecurringSchedule = {
    frequency: isCustomFrequency ? 'CUSTOM' : frequency,
    interval: rRule.interval,
    ends: RecurrenceEnd.NEVER,
  };

  if (isCustomFrequency) {
    recurringSchedule.customFrequency = frequency;
  }

  if (frequency !== Frequency.MONTHLY && rRule.byweekday) {
    recurringSchedule.byweekday = rRule.byweekday.reduce<Record<string, boolean>>((acc, day) => {
      const isoWeekDay = RRULE_TO_ISO_WEEKDAYS[day];
      if (isoWeekDay != null) {
        acc[isoWeekDay] = true;
      }
      return acc;
    }, {});
  }
  if (frequency === Frequency.MONTHLY) {
    if (rRule.byweekday?.length) {
      recurringSchedule.bymonth = 'weekday';
      recurringSchedule.bymonthweekday = rRule.byweekday[0];
    } else if (rRule.bymonthday?.length) {
      recurringSchedule.bymonth = 'day';
      recurringSchedule.bymonthday = rRule.bymonthday[0];
    }
  }

  if (rRule.byhour?.length && rRule.byminute?.length) {
    recurringSchedule.byhour = rRule.byhour[0];
    recurringSchedule.byminute = rRule.byminute[0];
  }

  return {
    title,
    recurringSchedule,
    reportTypeId: report.jobtype as ScheduledReport['reportTypeId'],
    timezone: schedule.rrule.tzid,
    recurring: true,
    sendByEmail: Boolean(notification?.email),
    emailRecipients: [...(notification?.email?.to || [])],
  };
};
