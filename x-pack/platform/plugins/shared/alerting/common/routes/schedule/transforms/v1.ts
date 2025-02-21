/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { isEmpty, isUndefined, omitBy } from 'lodash';
import { Frequency } from '@kbn/rrule';
import { RuleSnooze } from '@kbn/alerting-types';
import type { RRule } from '../../../../server/application/r_rule/types';
import { ScheduleRequest } from '../types/v1';
import { DEFAULT_TIMEZONE, DURATION_REGEX, INTERVAL_FREQUENCY_REGEXP } from '../constants';

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
    default:
      return;
  }
};

const getDurationInMilliseconds = (duration: string): number => {
  if (duration === '-1') {
    return -1;
  }

  const [, durationNumber, durationUnit] = duration.match(DURATION_REGEX) ?? [];

  return moment
    .duration(durationNumber, durationUnit as moment.unitOfTime.DurationConstructor)
    .asMilliseconds();
};

const getDurationInString = (duration: number): string => {
  if (duration === -1) {
    return '-1';
  }

  const durationInHours = moment.duration(duration, 'milliseconds').asHours();
  if (durationInHours > 1) {
    return `${durationInHours}h`;
  }

  const durationInSeconds = moment.duration(duration, 'milliseconds').asSeconds();
  if (durationInSeconds % 60 === 0) {
    return `${durationInSeconds / 60}m`;
  }
  return `${durationInSeconds}s`;
};

export const transformScheduleToRRule: (schedule: ScheduleRequest) => {
  duration: number;
  rRule: RRule | undefined;
} = (schedule) => {
  const { recurring, duration, start, timezone } = schedule ?? {};

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

export const transformRRuleToSchedule: (
  snoozeSchedule: RuleSnooze | undefined
) => Array<ScheduleRequest & { id: string | undefined }> = (snoozeSchedule) => {
  if (!snoozeSchedule) {
    return [];
  }

  const result = snoozeSchedule.map((schedule) => {
    const { rRule, duration, id } = schedule;
    const transformedFrequency = transformFrequencyToEvery(rRule.freq as Frequency);
    const transformedDuration = getDurationInString(duration);

    const recurring = {
      end: rRule.until ? new Date(rRule.until).toISOString() : undefined,
      every: rRule.interval ? `${rRule.interval}${transformedFrequency}` : undefined,
      onWeekDay: rRule.byweekday === null ? undefined : (rRule.byweekday as string[]),
      onMonthDay: rRule.bymonthday === null ? undefined : rRule.bymonthday,
      onMonth: rRule.bymonth === null ? undefined : rRule.bymonth,
      occurrences: rRule.count,
    };

    const filteredRecurring = omitBy(recurring, isUndefined);

    return {
      id,
      duration: transformedDuration,
      start: new Date(rRule.dtstart).toISOString(),
      timezone: rRule.tzid,
      ...(isEmpty(filteredRecurring) ? {} : { recurring: filteredRecurring }),
    };
  });

  return result;
};
