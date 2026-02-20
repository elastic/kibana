/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule, RruleSchedule, Schedule } from './schedule_types';

export function isIntervalSchedule(schedule: Schedule): schedule is IntervalSchedule {
  return (
    schedule &&
    'interval' in schedule &&
    typeof schedule.interval === 'string' &&
    schedule.interval !== ''
  );
}

export function isRruleSchedule(schedule: Schedule): schedule is RruleSchedule {
  return schedule && 'rrule' in schedule && schedule.rrule !== null;
}
