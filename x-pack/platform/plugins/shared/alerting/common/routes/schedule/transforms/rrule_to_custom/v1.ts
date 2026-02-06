/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { isEmpty, isUndefined, omitBy } from 'lodash';
import { Frequency } from '@kbn/rrule';
import type { RRule } from '../../../../../server/application/r_rule/types';
import type { ScheduleRequest } from '../../types/v1';

const DEFAULT_INTERVAL = 1;

const transformFrequencyToEvery = (frequency: Frequency) => {
  switch (frequency) {
    case Frequency.YEARLY:
      return 'y';
    case Frequency.MONTHLY:
      return 'M';
    case Frequency.WEEKLY:
      return 'w';
    case Frequency.DAILY:
      return 'd';
    case Frequency.HOURLY:
      return 'h';
    default:
      return;
  }
};

const getDurationInString = (duration: number): string => {
  const durationInDays = moment.duration(duration, 'milliseconds').asDays();
  if (durationInDays > 1 && Number.isInteger(durationInDays)) {
    return `${durationInDays}d`;
  }

  const durationInHours = moment.duration(duration, 'milliseconds').asHours();
  if (durationInHours > 1 && Number.isInteger(durationInHours)) {
    return `${durationInHours}h`;
  }

  const durationInSeconds = moment.duration(duration, 'milliseconds').asSeconds();
  const durationInMinutes = durationInSeconds / 60;
  if (Number.isInteger(durationInMinutes)) {
    return `${durationInMinutes}m`;
  } else if (Number.isInteger(durationInSeconds)) {
    return `${durationInSeconds}s`;
  }

  return `${duration}ms`;
};

export const transformRRuleToCustomSchedule = (snoozeSchedule: {
  duration: number;
  rRule: RRule;
}): ScheduleRequest => {
  const { rRule, duration } = snoozeSchedule;
  const transformedFrequency = transformFrequencyToEvery(rRule.freq as Frequency);
  const transformedDuration = getDurationInString(duration);

  // Determine default every value if interval is not set and frequency is set
  const defaultEvery =
    transformedFrequency && !rRule.interval
      ? `${DEFAULT_INTERVAL}${transformedFrequency}`
      : undefined;

  const recurring = {
    end: rRule.until ? new Date(rRule.until).toISOString() : undefined,
    every:
      rRule.interval && transformedFrequency
        ? `${rRule.interval}${transformedFrequency}`
        : defaultEvery,
    onWeekDay: rRule.byweekday === null ? undefined : (rRule.byweekday as string[]),
    onMonthDay: rRule.bymonthday === null ? undefined : rRule.bymonthday,
    onMonth: rRule.bymonth === null ? undefined : rRule.bymonth,
    occurrences: rRule.count,
  };

  const filteredRecurring = omitBy(recurring, isUndefined);

  return {
    duration: transformedDuration,
    start: new Date(rRule.dtstart).toISOString(),
    timezone: rRule.tzid,
    ...(isEmpty(filteredRecurring) ? {} : { recurring: filteredRecurring }),
  };
};
