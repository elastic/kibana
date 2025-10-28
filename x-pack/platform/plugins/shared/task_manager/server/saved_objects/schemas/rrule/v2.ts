/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Frequency } from '@kbn/rrule';
import { byhour, byminute, byweekday, bymonthday, rruleCommon as rruleCommonV1 } from './v1';

const validateStartDate = (date: string) => {
  const parsedValue = Date.parse(date);
  if (isNaN(parsedValue)) return `Invalid date: ${date}`;
  return;
};

export const rruleCommon = rruleCommonV1.extends({
  dtstart: schema.maybe(schema.string({ validate: validateStartDate })),
});

export const rruleMonthly = rruleCommon.extends({
  freq: schema.literal(Frequency.MONTHLY),
  byhour,
  byminute,
  byweekday,
  bymonthday,
});

export const rruleWeekly = rruleCommon.extends({
  freq: schema.literal(Frequency.WEEKLY),
  byhour,
  byminute,
  byweekday,
  bymonthday: schema.never(),
});

export const rruleDaily = rruleCommon.extends({
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
