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
import { DURATION_REGEX, INTERVAL_FREQUENCY_REGEXP } from '../constants';

const transformFrequency = (frequency?: string) => {
  switch (frequency) {
    case 'y':
      return Frequency.YEARLY;
    case 'm':
      return Frequency.MONTHLY;
    case 'w':
      return Frequency.WEEKLY;
    case 'd':
      return Frequency.DAILY;
    default:
      return;
  }
};

const getDurationMilliseconds = (duration: string): number => {
  if (duration === '-1') {
    return -1;
  }

  const [, durationNumber, durationUnit] = duration.match(DURATION_REGEX) ?? [];

  return moment
    .duration(durationNumber, durationUnit as moment.unitOfTime.DurationConstructor)
    .asMilliseconds();
};

export const transformSchedule: (schedule: ScheduleRequest) => {
  duration: number;
  rRule: RRule | undefined;
} = (schedule) => {
  const { recurring, duration, start, timezone } = schedule ?? {};

  const [, interval, frequency] = recurring?.every?.match(INTERVAL_FREQUENCY_REGEXP) ?? [];
  const transformedFrequency = transformFrequency(frequency);

  const durationInMilliseconds = getDurationMilliseconds(duration);

  return {
    duration: durationInMilliseconds,
    rRule: {
      byweekday: recurring?.onWeekDay,
      bymonthday: recurring?.onMonthDay,
      bymonth: recurring?.onMonth,
      until: recurring?.end,
      count: recurring?.occurrences,
      interval: interval ? parseInt(interval, 10) : undefined,
      freq: transformedFrequency,
      dtstart: start,
      tzid: timezone ?? 'UTC',
    },
  };
};
