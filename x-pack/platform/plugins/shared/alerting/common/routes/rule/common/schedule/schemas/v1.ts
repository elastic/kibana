/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Frequency } from '@kbn/rrule';

/**
 * Interval-only schedule (e.g. `1m`, `1h`). Shared by rule request and response.
 */
export const intervalScheduleSchema = schema.object({
  interval: schema.string({
    meta: { description: 'The interval is specified in seconds, minutes, hours, or days.' },
  }),
});

/**
 * Schema mirroring the raw rule schedule rrule shape (task-manager scheduleRruleSchemaV3).
 * Used so rule request/response schedule type matches what is stored and returned.
 */
const byminuteScheduleRrule = schema.maybe(
  schema.arrayOf(schema.number({ min: 0, max: 59 }), { minSize: 1 })
);
const byhourScheduleRrule = schema.maybe(
  schema.arrayOf(schema.number({ min: 0, max: 23 }), { minSize: 1 })
);
const byweekdayScheduleRrule = schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 }));
const bymonthdayScheduleRrule = schema.maybe(
  schema.arrayOf(schema.number({ min: 1, max: 31 }), { minSize: 1 })
);

const scheduleRruleCommon = schema.object({
  freq: schema.oneOf(
    [
      schema.literal(Frequency.YEARLY),
      schema.literal(Frequency.MONTHLY),
      schema.literal(Frequency.WEEKLY),
      schema.literal(Frequency.DAILY),
      schema.literal(Frequency.HOURLY),
      schema.literal(Frequency.MINUTELY),
      schema.literal(Frequency.SECONDLY),
    ],
    {
      meta: {
        description:
          'Recurrence frequency (YEARLY=0, MONTHLY=1, WEEKLY=2, DAILY=3, HOURLY=4, etc.).',
      },
    }
  ),
  interval: schema.number({
    min: 1,
    meta: { description: 'Interval of recurrence (e.g. every N days).' },
  }),
  tzid: schema.string({
    meta: { description: 'Timezone identifier (e.g. UTC, America/New_York).' },
  }),
  dtstart: schema.maybe(
    schema.string({ meta: { description: 'Start date for the recurrence in ISO format.' } })
  ),
});

const scheduleRruleMonthly = scheduleRruleCommon.extends({
  freq: schema.literal(Frequency.MONTHLY),
  byhour: byhourScheduleRrule,
  byminute: byminuteScheduleRrule,
  byweekday: byweekdayScheduleRrule,
  bymonthday: bymonthdayScheduleRrule,
});

const scheduleRruleWeekly = scheduleRruleCommon.extends({
  freq: schema.literal(Frequency.WEEKLY),
  byhour: byhourScheduleRrule,
  byminute: byminuteScheduleRrule,
  byweekday: byweekdayScheduleRrule,
  bymonthday: schema.never(),
});

const scheduleRruleDaily = scheduleRruleCommon.extends({
  freq: schema.literal(Frequency.DAILY),
  byhour: byhourScheduleRrule,
  byminute: byminuteScheduleRrule,
  byweekday: byweekdayScheduleRrule,
  bymonthday: schema.never(),
});

const scheduleRruleHourly = scheduleRruleCommon.extends({
  freq: schema.literal(Frequency.HOURLY),
  byminute: byminuteScheduleRrule,
  byhour: schema.never(),
  byweekday: schema.never(),
  bymonthday: schema.never(),
});

const ruleScheduleRruleSchema = schema.object({
  rrule: schema.oneOf([
    scheduleRruleMonthly,
    scheduleRruleWeekly,
    scheduleRruleDaily,
    scheduleRruleHourly,
  ]),
});

/**
 * Rule schedule: either an interval (e.g. `1m`, `1h`) or an rrule for recurrence-based scheduling.
 * Shared by rule request and response schemas.
 */
export const scheduleSchema = schema.oneOf([intervalScheduleSchema, ruleScheduleRruleSchema], {
  meta: {
    description:
      'The schedule: either an interval (e.g. `1m`, `1h`) or an rrule for recurrence-based scheduling.',
  },
});
