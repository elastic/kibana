/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isUndefined, omitBy } from 'lodash';
import { Frequency } from '@kbn/rrule';
import type { RRule } from '../../../../../server/application/r_rule/types';
import type { ScheduleRequest } from '../../types/v1';

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

export const transformRRuleToCustomSchedule = (snoozeSchedule?: {
  duration: number;
  rRule: RRule;
}): ScheduleRequest | undefined => {
  if (!snoozeSchedule) {
    return;
  }

  const { rRule, duration } = snoozeSchedule;
  const transformedFrequency = transformFrequencyToEvery(rRule.freq as Frequency);

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
    duration: duration.toString(),
    start: new Date(rRule.dtstart).toISOString(),
    timezone: rRule.tzid,
    ...(isEmpty(filteredRecurring) ? {} : { recurring: filteredRecurring }),
  };
};
