/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Frequency } from '@kbn/rrule';
import { byminute as byminuteV1 } from './v1';
import {
  rruleCommon as rruleCommonV2,
  rruleMonthly as rruleMonthlyV2,
  rruleWeekly as rruleWeeklyV2,
  rruleDaily as rruleDailyV2,
} from './v2';

const rruleMonthly = rruleMonthlyV2;
const rruleWeekly = rruleWeeklyV2;
const rruleDaily = rruleDailyV2;

const rruleHourly = rruleCommonV2.extends({
  freq: schema.literal(Frequency.HOURLY),
  byminute: byminuteV1,
  byhour: schema.never(),
  byweekday: schema.never(),
  bymonthday: schema.never(),
});

export const rruleSchedule = schema.oneOf([rruleMonthly, rruleWeekly, rruleDaily, rruleHourly]);
export const scheduleRruleSchema = schema.object({
  rrule: rruleSchedule,
});
