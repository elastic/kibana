/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  actionFrequencySchema as actionFrequencySchemav1,
  actionSchema as actionSchemaV1,
  actionAlertsFilterSchema as actionAlertsFilterSchemaV1,
  updateBodySchema as updateBodySchemaV1,
  updateParamsSchema as updateParamsSchemaV1,
} from './v1';
import { Frequency } from '@kbn/rrule';

const weekDays = schema.oneOf([
  schema.literal('MO'),
  schema.literal('TU'),
  schema.literal('WE'),
  schema.literal('TH'),
  schema.literal('FR'),
  schema.literal('SA'),
  schema.literal('SU'),
]);

const advancedThrottleMonthly = schema.object({
  freq: schema.literal(Frequency.MONTHLY),
  interval: schema.number(),
  bymonthday: schema.arrayOf(schema.number()),
  byhour: schema.arrayOf(schema.number()),
  byminute: schema.arrayOf(schema.number()),
  tzid: schema.string(),
  byweekday: schema.maybe(schema.never()),
});

const advancedThrottleWeekly = schema.object({
  freq: schema.literal(Frequency.WEEKLY),
  interval: schema.number(),
  byweekday: schema.arrayOf(weekDays),
  byhour: schema.arrayOf(schema.number()),
  byminute: schema.arrayOf(schema.number()),
  tzid: schema.string(),
  bymonthday: schema.maybe(schema.never()),
});

const advancedThrottleDaily = schema.object({
  freq: schema.literal(Frequency.DAILY),
  interval: schema.number(),
  byhour: schema.arrayOf(schema.number()),
  byminute: schema.arrayOf(schema.number()),
  tzid: schema.string(),
  byweekday: schema.maybe(schema.never()),
  bymonthday: schema.maybe(schema.never()),
});

const advancedThrottleHourly = schema.object({
  freq: schema.literal(Frequency.HOURLY),
  interval: schema.number(),
  byminute: schema.arrayOf(schema.number()),
  byhour: schema.maybe(schema.never()),
  tzid: schema.maybe(schema.never()),
  byweekday: schema.maybe(schema.never()),
  bymonthday: schema.maybe(schema.never()),
});

const advancedThrottleMinutely = schema.object({
  freq: schema.literal(Frequency.MINUTELY),
  interval: schema.number(),
  byminute: schema.maybe(schema.never()),
  byhour: schema.maybe(schema.never()),
  tzid: schema.string(),
  byweekday: schema.maybe(schema.never()),
  bymonthday: schema.maybe(schema.never()),
});

const advancedThrottleSecondly = schema.object({
  freq: schema.literal(Frequency.SECONDLY),
  interval: schema.number(),
  byminute: schema.maybe(schema.never()),
  byhour: schema.maybe(schema.never()),
  tzid: schema.string(),
  byweekday: schema.maybe(schema.never()),
  bymonthday: schema.maybe(schema.never()),
});
export const actionFrequencySchema = actionFrequencySchemav1.extends({
  advanced_throttle: schema.maybe(
    schema.oneOf([
      schema.oneOf([
        advancedThrottleMonthly,
        advancedThrottleWeekly,
        advancedThrottleDaily,
        advancedThrottleHourly,
        advancedThrottleMinutely,
        advancedThrottleSecondly,
      ]),
    ])
  ),
});

export const actionAlertsFilterSchema = actionAlertsFilterSchemaV1.extends({});

export const actionSchema = actionSchemaV1.extends({
  frequency: schema.maybe(actionFrequencySchema),
});

export const updateBodySchema = updateBodySchemaV1.extends({
  actions: schema.arrayOf(actionSchema, { defaultValue: [] }),
});

export const updateParamsSchema = updateParamsSchemaV1.extends({});
