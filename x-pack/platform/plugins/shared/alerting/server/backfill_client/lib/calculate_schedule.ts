/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule } from '@kbn/rrule';
import { isIntervalSchedule, isRruleSchedule } from '@kbn/response-ops-scheduling-types';
import type { Rrule } from '@kbn/response-ops-scheduling-types';
import { adHocRunStatus } from '../../../common/constants';
import { parseDuration } from '../../../common';
import type { RuleSchedule } from '../../../common';
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

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Renders a gap between two runs as a duration string parseDuration understands.
// Picks the largest unit that divides evenly, so 3600000 becomes '1h' rather than '3600s'.
const formatMsAsDuration = (ms: number): string => {
  const safeMs = Math.max(ms, MS_PER_SECOND);

  if (safeMs % MS_PER_DAY === 0) return `${safeMs / MS_PER_DAY}d`;
  if (safeMs % MS_PER_HOUR === 0) return `${safeMs / MS_PER_HOUR}h`;
  if (safeMs % MS_PER_MINUTE === 0) return `${safeMs / MS_PER_MINUTE}m`;

  return `${Math.round(safeMs / MS_PER_SECOND)}s`;
};

// Walks the rrule one occurrence at a time, re-anchoring dtstart to the previous occurrence the
// way Task Manager's getNextRunAt does. RRule.between would materialise every occurrence since the
// original dtstart and throws once it passes its internal iteration limit, which a wide backfill
// range easily does.
const getRruleOccurrences = (rrule: Rrule, start: string, end: string, maxEntries?: number) => {
  const endMs = new Date(end).valueOf();
  const occurrences: Date[] = [];
  // Start strictly after the range start, matching the interval schedule, where the first run
  // covers the window that opens at the range start rather than the one closing on it.
  let cursor = new Date(start);

  while (!maxEntries || occurrences.length < maxEntries) {
    const next = new RRule({ ...rrule, dtstart: cursor }).after(new Date(cursor.valueOf() + 1));

    if (!next || next.valueOf() > endMs) {
      break;
    }

    occurrences.push(next);
    cursor = next;
  }

  return occurrences;
};

const getScheduleFromRrule = (
  rrule: Rrule,
  start: string,
  end: string,
  maxEntries?: number
): AdHocRunSchedule[] => {
  const occurrences = getRruleOccurrences(rrule, start, end, maxEntries);

  return occurrences.map((runAt, index) => {
    // Each run covers the gap since the previous occurrence. The first entry has no previous
    // occurrence in range, so it borrows the gap to the next one.
    const previous = occurrences[index - 1];
    const next = occurrences[index + 1];
    const gapMs = previous
      ? runAt.valueOf() - previous.valueOf()
      : next
      ? next.valueOf() - runAt.valueOf()
      : runAt.valueOf() - new Date(start).valueOf();

    return {
      status: adHocRunStatus.PENDING,
      runAt: runAt.toISOString(),
      interval: formatMsAsDuration(gapMs),
    };
  });
};

export interface CalculateScheduleResult {
  schedule: AdHocRunSchedule[];
  truncated: boolean;
}

export function calculateSchedule(
  ruleSchedule: RuleSchedule,
  ranges: Array<{ start: string; end: string }>
): CalculateScheduleResult {
  if (!isIntervalSchedule(ruleSchedule) && !isRruleSchedule(ruleSchedule)) {
    throw new Error('Schedule is neither an interval nor an rrule, unable to calculate backfill');
  }

  const schedule: AdHocRunSchedule[] = [];
  let truncated = false;
  for (const range of ranges) {
    const remaining = MAX_SCHEDULE_ENTRIES - schedule.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const entries = isIntervalSchedule(ruleSchedule)
      ? getScheduleFromInterval(range.start, ruleSchedule.interval, range.end, remaining)
      : getScheduleFromRrule(ruleSchedule.rrule, range.start, range.end, remaining);
    schedule.push(...entries);
  }
  if (schedule.length >= MAX_SCHEDULE_ENTRIES) {
    truncated = true;
  }
  return { schedule, truncated };
}
