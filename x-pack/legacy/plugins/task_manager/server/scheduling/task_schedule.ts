/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { intervalFromDate, intervalFromNow } from './intervals';

export type TaskSchedule = IntervalSchedule;

export interface IntervalSchedule {
  /**
   * An interval in minutes (e.g. '5m'). If specified, this is a recurring task.
   * */
  interval: string;
}

function isInterval(schedule: TaskSchedule): schedule is IntervalSchedule {
  return !!(schedule as IntervalSchedule).interval;
}

export function nextScheduledRunFromDate(date: Date, schedule?: TaskSchedule) {
  if (schedule && isInterval(schedule)) {
    return intervalFromDate(date, schedule.interval);
  }
}
export function nextScheduledRunFromNow(schedule: TaskSchedule) {
  if (isInterval(schedule)) {
    return intervalFromNow(schedule.interval);
  }
}
