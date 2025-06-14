/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adHocRunStatus } from '../../../common/constants';
import { parseDuration } from '../../../common';
import type { AdHocRunSchedule } from '../../data/ad_hoc_run/types';

const getScheduleFromInterval = (
  start: string,
  interval: string,
  end?: string
): AdHocRunSchedule[] => {
  const schedule: AdHocRunSchedule[] = [];
  const intervalInMs = parseDuration(interval);

  let currentStart: Date = new Date(start);
  let currentEnd;
  do {
    currentEnd = new Date(currentStart.valueOf() + intervalInMs);
    schedule.push({ status: adHocRunStatus.PENDING, runAt: currentEnd.toISOString(), interval });

    currentStart = currentEnd;
  } while (end && currentEnd && currentEnd.valueOf() < new Date(end).valueOf());

  return schedule;
};

export function calculateSchedule(
  interval: string,
  ranges: Array<{ start: string; end: string }>
): AdHocRunSchedule[] {
  return ranges.flatMap((range) => {
    return getScheduleFromInterval(range.start, interval, range.end);
  });
}
