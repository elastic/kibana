/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { Frequency } from '@kbn/rrule';
import type { RRule } from '../../../../server/application/r_rule/types';
import { ScheduleRequest } from '../types/v1';

const transformFrequency = (frequency: string) => {
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
    case 'm':
      return Frequency.MINUTELY;
    case 's':
      return Frequency.SECONDLY;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
};

export const transformScheduleToRRule: (schedule: ScheduleRequest) => {
  rRule: RRule | undefined;
} = (schedule) => {
  const { recurring } = schedule ?? {};
  const [interval, frequency] = recurring?.every?.split('') ?? [];
  const freq = frequency ? transformFrequency(frequency) : undefined;
  const timeZone = moment.tz.guess();

  return {
    rRule: {
      byweekday: recurring?.onWeekDay,
      bymonthday: recurring?.onMonthDay,
      bymonth: recurring?.onMonth,
      until: recurring?.end,
      count: recurring?.occurrences,
      interval: interval ? parseInt(interval, 10) : undefined,
      freq,
      dtstart: schedule.start,
      tzid: `${timeZone}`,
    },
  };
};
