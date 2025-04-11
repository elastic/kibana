/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Frequency } from '@kbn/rrule';
import moment from 'moment-timezone';

function validateTimezone(timezone: string) {
  if (moment.tz.zone(timezone) != null) {
    return;
  }

  return 'string is not a valid timezone: ' + timezone;
}

const rruleCommon = schema.object({
  freq: schema.number(),
  interval: schema.number(),
  tzid: schema.string({ validate: validateTimezone, defaultValue: 'UTC' }),
});

const byminute = schema.maybe(schema.arrayOf(schema.number({ min: 0, max: 59 })));
const byhour = schema.maybe(schema.arrayOf(schema.number({ min: 0, max: 23 })));
const byweekday = schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 7 })));
const bymonthday = schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 31 })));

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
