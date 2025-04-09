/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Frequency } from '@kbn/rrule';

const rruleCommon = schema.object({
  freq: schema.literal(Frequency.MONTHLY),
  interval: schema.number(),
  tzid: schema.string({ defaultValue: 'UTC' }),
});

const rruleMonthly = rruleCommon.extends({
  freq: schema.literal(Frequency.MONTHLY),
  byhour: schema.maybe(schema.arrayOf(schema.number())),
  byminute: schema.maybe(schema.arrayOf(schema.number())),
  byweekday: schema.maybe(schema.never()),
  bymonthday: schema.maybe(schema.arrayOf(schema.number())),
});

const rruleWeekly = rruleCommon.extends({
  freq: schema.literal(Frequency.WEEKLY),
  bbyhour: schema.maybe(schema.arrayOf(schema.number())),
  byminute: schema.maybe(schema.arrayOf(schema.number())),
  byweekday: schema.maybe(schema.arrayOf(schema.number())), // TODO: use Weekday enum
  bymonthday: schema.maybe(schema.never()),
});

const rruleDaily = rruleCommon.extends({
  freq: schema.literal(Frequency.DAILY),
  byhour: schema.maybe(schema.arrayOf(schema.number())),
  byminute: schema.maybe(schema.arrayOf(schema.number())),
  byweekday: schema.maybe(schema.never()),
  bymonthday: schema.maybe(schema.never()),
});

export const rruleSchedule = schema.oneOf([rruleMonthly, rruleWeekly, rruleDaily]);
