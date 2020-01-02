/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseDuration } from './parse_duration';
import { IntervalSchedule } from '../types';

export function getNextRunAt(currentRunAt: Date, schedule: IntervalSchedule) {
  let nextRunAt = currentRunAt.getTime() + parseDuration(schedule.interval);
  if (nextRunAt < Date.now()) {
    // To prevent returning dates in the past, we'll return now instead
    nextRunAt = Date.now();
  }
  return new Date(nextRunAt);
}
