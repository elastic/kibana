/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { transformScheduledReport } from './utils';
import { ScheduledReportApiJSON } from '@kbn/reporting-common/types';
import { RecurrenceEnd } from '@kbn/response-ops-recurring-schedule-form/constants';

const baseReport = {
  title: 'Test report',
  reportTypeId: 'report123',
  notification: { email: { to: ['test@example.com'] } },
  schedule: {
    rrule: {
      freq: Frequency.WEEKLY,
      interval: 1,
      tzid: 'America/New_York',
      byweekday: ['MO'],
    },
  },
  jobtype: 'report123',
} as unknown as ScheduledReportApiJSON;

describe('transformScheduledReport', () => {
  it('transforms a non-custom rRule with freq=WEEKLY and one weekday', () => {
    expect(transformScheduledReport(baseReport)).toEqual(
      expect.objectContaining({
        title: 'Test report',
        reportTypeId: 'report123',
        timezone: 'America/New_York',
        recurring: true,
        sendByEmail: true,
        emailRecipients: ['test@example.com'],
        recurringSchedule: {
          frequency: Frequency.WEEKLY,
          interval: 1,
          ends: RecurrenceEnd.NEVER,
          byweekday: { 1: true },
        },
      })
    );
  });

  it('marks as custom when freq=DAILY and interval > 1', () => {
    const report = {
      ...baseReport,
      schedule: { rrule: { freq: Frequency.DAILY, tzid: 'UTC', interval: 2 } },
    } as ScheduledReportApiJSON;
    expect(transformScheduledReport(report).recurringSchedule).toEqual(
      expect.objectContaining({
        frequency: 'CUSTOM',
        customFrequency: Frequency.DAILY,
        interval: 2,
      })
    );
  });

  it('marks as custom when freq=DAILY and no weekdays', () => {
    const report = {
      ...baseReport,
      schedule: { rrule: { freq: Frequency.DAILY, tzid: 'UTC' } },
    } as ScheduledReportApiJSON;
    expect(transformScheduledReport(report).recurringSchedule).toEqual(
      expect.objectContaining({ frequency: 'CUSTOM', customFrequency: Frequency.DAILY })
    );
  });

  it('marks as custom when freq=WEEKLY and multiple weekdays', () => {
    const report = {
      ...baseReport,
      schedule: { rrule: { freq: Frequency.WEEKLY, tzid: 'UTC', byweekday: ['MO', 'TU'] } },
    } as ScheduledReportApiJSON;
    expect(transformScheduledReport(report).recurringSchedule).toEqual(
      expect.objectContaining({ frequency: 'CUSTOM', customFrequency: Frequency.WEEKLY })
    );
  });

  it('handles monthly with bymonthday', () => {
    const report = {
      ...baseReport,
      schedule: { rrule: { freq: Frequency.MONTHLY, tzid: 'UTC', bymonthday: [15] } },
    } as ScheduledReportApiJSON;
    expect(transformScheduledReport(report).recurringSchedule).toEqual(
      expect.objectContaining({ frequency: 'CUSTOM', bymonth: 'day', bymonthday: 15 })
    );
  });

  it('handles monthly with byweekday', () => {
    const report = {
      ...baseReport,
      schedule: { rrule: { freq: Frequency.MONTHLY, tzid: 'UTC', byweekday: ['FR'] } },
    } as ScheduledReportApiJSON;
    expect(transformScheduledReport(report).recurringSchedule).toEqual(
      expect.objectContaining({ bymonth: 'weekday', bymonthweekday: 'FR' })
    );
  });

  it('extracts byhour and byminute', () => {
    const report = {
      ...baseReport,
      schedule: {
        rrule: {
          freq: Frequency.WEEKLY,
          tzid: 'UTC',
          byhour: [8],
          byminute: [30],
          byweekday: ['MO'],
        },
      },
    } as ScheduledReportApiJSON;
    expect(transformScheduledReport(report).recurringSchedule).toEqual(
      expect.objectContaining({ byhour: 8, byminute: 30 })
    );
  });

  it('returns empty recipients if no notification', () => {
    const report = { ...baseReport, notification: undefined } as ScheduledReportApiJSON;
    expect(transformScheduledReport(report)).toEqual(
      expect.objectContaining({ sendByEmail: false, emailRecipients: [] })
    );
  });
});
