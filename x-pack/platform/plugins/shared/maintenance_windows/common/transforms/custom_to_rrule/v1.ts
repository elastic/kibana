/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { DEFAULT_TIMEZONE, INTERVAL_FREQUENCY_REGEXP } from '../../constants';
import type { RRuleRecord, Schedule } from '../../types';

const transformEveryToFrequency = (frequency?: string) => {
  switch (frequency) {
    case 'y':
      return Frequency.YEARLY;
    case 'M':
      return Frequency.MONTHLY;
    case 'w':
      return Frequency.WEEKLY;
    case 'd':
      return Frequency.DAILY;
    case 'h':
      return Frequency.HOURLY;
    default:
      return;
  }
};

export const transformCustomScheduleToRRule = (
  schedule: Schedule
): {
  rRule: RRuleRecord;
} => {
  const { recurring, start, timezone } = schedule;

  const [, interval, frequency] = recurring?.every?.match(INTERVAL_FREQUENCY_REGEXP) ?? [];
  const transformedFrequency = transformEveryToFrequency(frequency);

  return {
    rRule: {
      ...(recurring?.onWeekDay !== undefined ? { byweekday: recurring?.onWeekDay } : {}),
      ...(recurring?.onMonthDay !== undefined ? { bymonthday: recurring?.onMonthDay } : {}),
      ...(recurring?.onMonth !== undefined ? { bymonth: recurring?.onMonth } : {}),
      ...(recurring?.end !== undefined ? { until: recurring?.end } : {}),
      ...(recurring?.occurrences !== undefined ? { count: recurring?.occurrences } : {}),
      ...(interval !== undefined ? { interval: parseInt(interval, 10) } : {}),
      freq: transformedFrequency,
      dtstart: start,
      tzid: timezone ?? DEFAULT_TIMEZONE,
    },
  };
};
