/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adHocRunStatus } from '../../../common/constants';
import { parseDuration } from '../../../common';
import type { AdHocRunSchedule } from '../../data/ad_hoc_run/types';

export const MAX_SCHEDULE_ENTRIES = 10_000;

export const SCHEDULE_TRUNCATED_WARNING = `Backfill schedule was truncated to the maximum allowed entries of ${MAX_SCHEDULE_ENTRIES}.`;

const getScheduleFromInterval = (
  start: string,
  interval: string,
  end?: string,
  maxEntries?: number
): AdHocRunSchedule[] => {
  const schedule: AdHocRunSchedule[] = [];
  const intervalInMs = parseDuration(interval);

  let currentStart: Date = new Date(start);
  let currentEnd;
  do {
    currentEnd = new Date(currentStart.valueOf() + intervalInMs);
    schedule.push({ status: adHocRunStatus.PENDING, runAt: currentEnd.toISOString(), interval });

    if (maxEntries && schedule.length >= maxEntries) break;

    currentStart = currentEnd;
  } while (end && currentEnd && currentEnd.valueOf() < new Date(end).valueOf());

  return schedule;
};

export interface CalculateScheduleResult {
  schedule: AdHocRunSchedule[];
  truncated: boolean;
}

export function calculateSchedule(
  interval: string,
  ranges: Array<{ start: string; end: string }>
): CalculateScheduleResult {
  const schedule: AdHocRunSchedule[] = [];
  let truncated = false;
  for (const range of ranges) {
    const remaining = MAX_SCHEDULE_ENTRIES - schedule.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const entries = getScheduleFromInterval(range.start, interval, range.end, remaining);
    schedule.push(...entries);
  }
  if (schedule.length >= MAX_SCHEDULE_ENTRIES) {
    truncated = true;
  }
  return { schedule, truncated };
}
