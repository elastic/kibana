/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalFields } from '@kbn/event-log-plugin/server/es/cluster_client_adapter';
import type { BackfillSchedule } from '../../../application/backfill/result/types';
import { parseDuration } from '../../../../common';
import { clipDateInterval } from '../gap/interval_utils';
import type { Gap } from '../gap';
import type { GapBase } from '../../../application/gaps/types';

export interface ScheduledItem {
  from: Date;
  to: Date;
  status: BackfillSchedule['status'];
}

export const toScheduledItem = (backfillSchedule: BackfillSchedule): ScheduledItem => {
  const runAt = new Date(backfillSchedule.runAt).getTime();
  const intervalDuration = parseDuration(backfillSchedule.interval);
  const from = runAt - intervalDuration;
  const to = runAt;
  return {
    from: new Date(from),
    to: new Date(to),
    status: backfillSchedule.status,
  };
};

const findEarliestOverlapping = (
  startMs: number,
  endMs: number,
  scheduledItems: ScheduledItem[]
) => {
  let startIdx = 0;
  let endIdx = scheduledItems.length - 1;

  let earliestOverlapping = scheduledItems.length;

  while (startIdx <= endIdx) {
    const midIdx = Math.floor((endIdx - startIdx) / 2) + startIdx;
    const scheduledItem = scheduledItems[midIdx];

    if (endMs <= scheduledItem.from.getTime()) {
      endIdx = midIdx - 1;
      continue;
    }

    if (startMs >= scheduledItem.to.getTime()) {
      startIdx = midIdx + 1;
      continue;
    }

    // There is an overlap at this point
    earliestOverlapping = Math.min(earliestOverlapping, midIdx);
    // go left to see if there is an earlier interval
    endIdx = midIdx - 1;
  }

  return earliestOverlapping < scheduledItems.length ? earliestOverlapping : null;
};

const clipScheduled = (startMs: number, endMs: number, scheduledItem: ScheduledItem) => {
  const clipped = clipDateInterval(
    scheduledItem.from,
    scheduledItem.to,
    new Date(startMs),
    new Date(endMs)
  );
  if (clipped === null) {
    throw new Error('Clipped interval in an scheduled item cannot be null');
  }

  return {
    from: clipped.start,
    to: clipped.end,
    status: scheduledItem.status,
  };
};

const findOverlapping = (startMs: number, endMs: number, scheduledItems: ScheduledItem[]) => {
  let earliestIdx = findEarliestOverlapping(startMs, endMs, scheduledItems);
  const overlapping: ScheduledItem[] = [];
  if (earliestIdx === null) {
    return overlapping;
  }

  while (earliestIdx < scheduledItems.length) {
    const scheduled = scheduledItems[earliestIdx];
    if (scheduled.from.getTime() >= endMs) {
      break;
    }

    overlapping.push(scheduled);
    earliestIdx++;
  }

  overlapping[0] = clipScheduled(startMs, endMs, overlapping[0]);
  overlapping[overlapping.length - 1] = clipScheduled(
    startMs,
    endMs,
    overlapping[overlapping.length - 1]
  );

  return overlapping;
};

export const findOverlappingIntervals = (gaps: Gap[], scheduledItems: ScheduledItem[]) => {
  return gaps.map((gap) => {
    return {
      gap,
      scheduled: findOverlapping(gap.range.gte.getTime(), gap.range.lte.getTime(), scheduledItems),
    };
  });
};

/**
 * Converts an array of Gap objects to the format expected by updateGapsInEventLog.
 * Filters out gaps without internalFields.
 */
export const prepareGapsForUpdate = (
  gaps: Gap[]
): Array<{ gap: GapBase; internalFields: InternalFields }> => {
  return gaps.reduce<Array<{ gap: GapBase; internalFields: InternalFields }>>((acc, gap) => {
    if (gap.internalFields) {
      acc.push({
        gap: gap.toObject(),
        internalFields: gap.internalFields,
      });
    }
    return acc;
  }, []);
};
