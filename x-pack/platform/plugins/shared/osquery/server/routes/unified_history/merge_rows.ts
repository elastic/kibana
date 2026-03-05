/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MergeableRow {
  id: string;
  rowType: 'live' | 'scheduled';
  timestamp: string;
}

export interface MergeResult<T extends MergeableRow> {
  rows: T[];
  hasMore: boolean;
  nextActionsCursor?: string;
  nextScheduledCursor?: string;
  nextScheduledOffset?: number;
  scheduledConsumedOnPage: number;
}

/**
 * Merges two independently-fetched streams of rows (live actions and scheduled
 * executions) into a single time-ordered page and computes per-source cursors
 * for the next page.
 *
 * @param liveRows - Live action rows (already filtered by source type)
 * @param allScheduledRows - All scheduled rows returned by ES (before offset)
 * @param pageSize - Maximum rows to return
 * @param scheduledOffset - Number of scheduled rows already consumed on previous pages
 */
export const mergeRows = <T extends MergeableRow>(
  liveRows: T[],
  allScheduledRows: T[],
  pageSize: number,
  scheduledOffset: number = 0
): MergeResult<T> => {
  const scheduledRows = allScheduledRows.slice(scheduledOffset);

  const allMerged = [...liveRows, ...scheduledRows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const hasMore = allMerged.length > pageSize;
  const merged = allMerged.slice(0, pageSize);

  const scheduledConsumedOnPage = merged.filter((r) => r.rowType === 'scheduled').length;

  let nextActionsCursor: string | undefined;
  let nextScheduledCursor: string | undefined;

  for (let i = merged.length - 1; i >= 0; i--) {
    if (!nextActionsCursor && merged[i].rowType === 'live') {
      nextActionsCursor = merged[i].timestamp;
    }

    if (!nextScheduledCursor && merged[i].rowType === 'scheduled') {
      nextScheduledCursor = merged[i].timestamp;
    }

    if (nextActionsCursor && nextScheduledCursor) break;
  }

  const nextScheduledOffsetValue = scheduledOffset + scheduledConsumedOnPage;

  return {
    rows: merged,
    hasMore,
    nextActionsCursor: hasMore ? nextActionsCursor : undefined,
    nextScheduledCursor: hasMore ? nextScheduledCursor : undefined,
    nextScheduledOffset: hasMore ? nextScheduledOffsetValue : undefined,
    scheduledConsumedOnPage,
  };
};
