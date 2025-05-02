/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { Frequency } from '@kbn/rrule';
import type { RRuleRequestV1 } from '../../../r_rule';
import type { ScheduleRequest } from '../../types/v1';
import { DEFAULT_TIMEZONE, DURATION_REGEX, INTERVAL_FREQUENCY_REGEXP } from '../../constants';

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
    default:
      return;
  }
};

const getDurationInMilliseconds = (duration: string): number => {
  const [, durationNumber, durationUnit] = duration.match(DURATION_REGEX) ?? [];

  return moment
    .duration(durationNumber, durationUnit as moment.unitOfTime.DurationConstructor)
    .asMilliseconds();
};

export const transformCustomScheduleToRRule = (
  schedule: ScheduleRequest
): {
  duration: number;
  rRule: RRuleRequestV1;
} => {
  const { recurring, duration, start, timezone } = schedule;

  const [, interval, frequency] = recurring?.every?.match(INTERVAL_FREQUENCY_REGEXP) ?? [];
  const transformedFrequency = transformEveryToFrequency(frequency);

  const durationInMilliseconds = getDurationInMilliseconds(duration);

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
      tzid: timezone ?? DEFAULT_TIMEZONE,
    },
  };
};
