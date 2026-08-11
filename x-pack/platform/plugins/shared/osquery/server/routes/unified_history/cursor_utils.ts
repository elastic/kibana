/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DecodedCursor,
  ScheduledHistoryRow,
  UnifiedHistoryRow,
} from '../../../common/api/unified_history/types';
import type { SortValues } from './query_live_actions_dsl';
import type { MergeResult } from './merge_rows';

export interface ComputePaginationCursorsParams {
  mergeResult: MergeResult<UnifiedHistoryRow>;
  sortValuesMap: Map<string, SortValues>;
  decoded: DecodedCursor;
  scheduledOffset: number;
}

export interface ComputePaginationCursorsResult {
  nextActionSearchAfter: SortValues | undefined;
  nextScheduledCursor: string | undefined;
  nextScheduledOffset: number;
}

export const decodeCursor = (nextPage?: string): DecodedCursor => {
  if (!nextPage) return {};
  try {
    return JSON.parse(Buffer.from(nextPage, 'base64').toString('utf8')) as DecodedCursor;
  } catch {
    return {};
  }
};

export const encodeCursor = (cursor: DecodedCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64');

export const computePaginationCursors = ({
  mergeResult,
  sortValuesMap,
  decoded,
  scheduledOffset,
}: ComputePaginationCursorsParams): ComputePaginationCursorsResult => {
  let nextSortValues: SortValues | undefined;
  for (let i = mergeResult.rows.length - 1; i >= 0; i--) {
    const row = mergeResult.rows[i];
    if (row.sourceType === 'live' && 'actionId' in row && row.actionId) {
      nextSortValues = sortValuesMap.get(row.actionId);
      if (nextSortValues) break;
    }
  }

  const nextActionSearchAfter = nextSortValues ?? decoded.actionSearchAfter;

  let nextScheduledCursor = decoded.scheduledCursor;
  let nextScheduledOffset = scheduledOffset;

  const scheduledOnPage = mergeResult.rows.filter(
    (r): r is ScheduledHistoryRow => r.sourceType === 'scheduled'
  );

  if (scheduledOnPage.length > 0) {
    const lastPlannedTime = scheduledOnPage[scheduledOnPage.length - 1].plannedTime;

    if (lastPlannedTime) {
      const boundaryCount = scheduledOnPage.filter((r) => r.plannedTime === lastPlannedTime).length;

      if (lastPlannedTime !== decoded.scheduledCursor) {
        nextScheduledCursor = lastPlannedTime;
        nextScheduledOffset = boundaryCount;
      } else {
        nextScheduledOffset = scheduledOffset + mergeResult.scheduledConsumedOnPage;
      }
    }
  }

  return {
    nextActionSearchAfter,
    nextScheduledCursor,
    nextScheduledOffset,
  };
};
