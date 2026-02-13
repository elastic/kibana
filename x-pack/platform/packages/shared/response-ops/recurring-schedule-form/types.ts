/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Frequency, WeekdayStr, Options } from '@kbn/rrule';

export type RecurrenceFrequency = Extract<
  Frequency,
  Frequency.YEARLY | Frequency.MONTHLY | Frequency.WEEKLY | Frequency.DAILY | Frequency.HOURLY
>;

export interface RecurringSchedule {
  frequency: RecurrenceFrequency | 'CUSTOM';
  interval?: number;
  ends: string;
  until?: string;
  count?: number;
  customFrequency?: RecurrenceFrequency;
  byweekday?: Record<string, boolean>;
  bymonth?: string;
  bymonthweekday?: string;
  bymonthday?: number;
  byhour?: number;
  byminute?: number;
}

export type RRuleParams = Partial<RRuleRecord> & Pick<RRuleRecord, 'dtstart' | 'tzid'>;

// An iCal RRULE  to define a recurrence schedule, see https://github.com/jakubroztocil/rrule for the spec
export type RRuleRecord = Omit<Options, 'dtstart' | 'byweekday' | 'wkst' | 'until'> & {
  dtstart: string;
  byweekday?: Array<WeekdayStr | string | number> | null;
  wkst?: WeekdayStr;
  until?: string;
};
