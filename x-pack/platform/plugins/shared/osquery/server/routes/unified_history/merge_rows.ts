/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MergeableRow {
  id: string;
  sourceType: 'live' | 'scheduled';
  timestamp: string;
  plannedTime?: string;
}

export interface MergeResult<T extends MergeableRow> {
  rows: T[];
  hasMore: boolean;
  scheduledConsumedOnPage: number;
}

/**
 * Merges live rows (already paginated via search_after) with scheduled rows
 * (fetched via multi_terms aggregation, paginated via cursor + offset).
 *
 * Both inputs are assumed to be sorted descending. Live rows sort by
 * `timestamp` (stable via search_after); scheduled rows sort by
 * `plannedTime` (deterministic per execution). The merge uses
 * `plannedTime ?? timestamp` so scheduled rows use the stable field.
 * `scheduledOffset` is the number of buckets to skip within the current
 * cursor window — it resets when the cursor timestamp advances.
 */
export const mergeRows = <T extends MergeableRow>(
  liveRows: T[],
  allScheduledRows: T[],
  pageSize: number,
  scheduledOffset: number = 0,
  sortDirection: 'asc' | 'desc' = 'desc'
): MergeResult<T> => {
  const scheduledRows = allScheduledRows.slice(scheduledOffset);
  const directionMultiplier = sortDirection === 'desc' ? 1 : -1;

  const allMerged = [...liveRows, ...scheduledRows].sort(
    (a, b) =>
      directionMultiplier *
      (new Date(b.plannedTime ?? b.timestamp).getTime() -
        new Date(a.plannedTime ?? a.timestamp).getTime())
  );

  const hasMore = allMerged.length > pageSize;
  const merged = allMerged.slice(0, pageSize);

  const scheduledConsumedOnPage = merged.filter((r) => r.sourceType === 'scheduled').length;

  return {
    rows: merged,
    hasMore,
    scheduledConsumedOnPage,
  };
};
