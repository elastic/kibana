/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule } from '@kbn/rrule';
import {
  isIntervalSchedule,
  isRruleSchedule,
  type Rrule,
} from '@kbn/response-ops-scheduling-types';
import { adHocRunStatus } from '../../../common/constants';
import { parseDuration, type RuleSchedule } from '../../../common';
import type { AdHocRunSchedule } from '../../data/ad_hoc_run/types';

const RRULE_BACKFILL_INTERVAL = '-'; // this is a placeholder for the interval metadata in the ad hoc run

const getAdhocRunScheduleFromInterval = (
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

const getAdhocRunScheduleFromRrule = (
  rrule: Rrule,
  rangeStart: string,
  rangeEnd: string
): AdHocRunSchedule[] => {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const _rrule = new RRule({
    ...rrule,
    dtstart: rrule.dtstart ? new Date(rrule.dtstart) : new Date(),
  });
  const occurrences = _rrule.between(start, end);
  return occurrences.map((date) => ({
    status: adHocRunStatus.PENDING,
    runAt: date.toISOString(),
    interval: RRULE_BACKFILL_INTERVAL,
  }));
};

export function calculateSchedule(
  schedule: RuleSchedule,
  ranges: Array<{ start: string; end: string }>
): AdHocRunSchedule[] {
  if (isIntervalSchedule(schedule)) {
    return ranges.flatMap((range) =>
      getAdhocRunScheduleFromInterval(range.start, schedule.interval, range.end)
    );
  }

  if (isRruleSchedule(schedule)) {
    return ranges.flatMap((range) =>
      getAdhocRunScheduleFromRrule(schedule.rrule, range.start, range.end)
    );
  }

  throw new Error('Invalid schedule, unable to calculate backfill run times');
}
