/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Frequency } from '@kbn/rrule';
import moment from 'moment-timezone';

export function validateTimezone(timezone: string) {
  if (moment.tz.zone(timezone) != null) {
    return;
  }

  return 'string is not a valid timezone: ' + timezone;
}

const validateRecurrenceByWeekday = (array: string[]) => {
  if (array.length === 0) {
    return 'rRule byweekday cannot be empty';
  }

  const byWeekDayRegex = new RegExp('^(((\\+|-)[1-4])?(MO|TU|WE|TH|FR|SA|SU))$');
  const invalidDays: string[] = [];

  array.forEach((day) => {
    if (!byWeekDayRegex.test(day)) {
      invalidDays.push(day);
    }
  });

  if (invalidDays.length > 0) {
    return `invalid byweekday values in rRule byweekday: ${invalidDays.join(',')}`;
  }
};

export const rruleCommon = schema.object({
  freq: schema.oneOf([
    schema.literal(0),
    schema.literal(1),
    schema.literal(2),
    schema.literal(3),
    schema.literal(4),
    schema.literal(5),
    schema.literal(6),
  ]),
  interval: schema.number({
    validate: (interval: number) => {
      if (!Number.isInteger(interval)) {
        return 'rRule interval must be an integer greater than 0';
      }
    },
    min: 1,
  }),
  tzid: schema.string({ validate: validateTimezone, defaultValue: 'UTC' }),
});

export const byminute = schema.maybe(
  schema.arrayOf(schema.number({ min: 0, max: 59 }), { minSize: 1 })
);
export const byhour = schema.maybe(
  schema.arrayOf(schema.number({ min: 0, max: 23 }), { minSize: 1 })
);
export const byweekday = schema.maybe(
  schema.arrayOf(schema.string(), {
    minSize: 1,
    validate: validateRecurrenceByWeekday,
  })
);
export const bymonthday = schema.maybe(
  schema.arrayOf(schema.number({ min: 1, max: 31 }), { minSize: 1 })
);

const rruleMonthly = rruleCommon.extends({
  freq: schema.literal(Frequency.MONTHLY),
  byhour,
  byminute,
  byweekday,
  bymonthday,
});

const rruleWeekly = rruleCommon.extends({
  freq: schema.literal(Frequency.WEEKLY),
  byhour,
  byminute,
  byweekday,
  bymonthday: schema.never(),
});

const rruleDaily = rruleCommon.extends({
  freq: schema.literal(Frequency.DAILY),
  byhour,
  byminute,
  byweekday,
  bymonthday: schema.never(),
});

export const rruleSchedule = schema.oneOf([rruleMonthly, rruleWeekly, rruleDaily]);
export const scheduleRruleSchema = schema.object({
  rrule: rruleSchedule,
});
