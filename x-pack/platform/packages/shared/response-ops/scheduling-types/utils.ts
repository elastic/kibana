/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule, RruleSchedule, Schedule } from './schedule_types';

/** Narrows a schedule to the interval based variant. */
export const isIntervalSchedule = (schedule?: Schedule): schedule is IntervalSchedule =>
  schedule != null &&
  'interval' in schedule &&
  typeof schedule.interval === 'string' &&
  schedule.interval !== '';

/** Narrows a schedule to the rrule based variant. */
export const isRruleSchedule = (schedule?: Schedule): schedule is RruleSchedule =>
  schedule != null && 'rrule' in schedule && schedule.rrule != null;
