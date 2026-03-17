/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeableRow } from './merge_rows';
import { mergeRows } from './merge_rows';

const row = (
  id: string,
  sourceType: 'live' | 'scheduled',
  timestamp: string,
  plannedTime?: string
): MergeableRow => ({
  id,
  sourceType,
  timestamp,
  ...(plannedTime !== undefined && { plannedTime }),
});

describe('mergeRows', () => {
  test('empty both sources returns no rows', () => {
    const result = mergeRows([], [], 20);
    expect(result.rows).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.scheduledConsumedOnPage).toBe(0);
  });

  test('all-live page (no scheduled rows)', () => {
    const live = [
      row('l1', 'live', '2024-01-03T00:00:00Z'),
      row('l2', 'live', '2024-01-02T00:00:00Z'),
      row('l3', 'live', '2024-01-01T00:00:00Z'),
    ];
    const result = mergeRows(live, [], 5);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.id)).toEqual(['l1', 'l2', 'l3']);
    expect(result.hasMore).toBe(false);
    expect(result.scheduledConsumedOnPage).toBe(0);
  });

  test('all-scheduled page (no live rows)', () => {
    const scheduled = [
      row('s1', 'scheduled', '2024-01-03T00:00:00Z'),
      row('s2', 'scheduled', '2024-01-02T00:00:00Z'),
      row('s3', 'scheduled', '2024-01-01T00:00:00Z'),
    ];
    const result = mergeRows([], scheduled, 5);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.id)).toEqual(['s1', 's2', 's3']);
    expect(result.hasMore).toBe(false);
    expect(result.scheduledConsumedOnPage).toBe(3);
  });

  test('mixed page merges by timestamp descending', () => {
    const live = [
      row('l1', 'live', '2024-01-05T00:00:00Z'),
      row('l2', 'live', '2024-01-03T00:00:00Z'),
    ];
    const scheduled = [
      row('s1', 'scheduled', '2024-01-04T00:00:00Z'),
      row('s2', 'scheduled', '2024-01-02T00:00:00Z'),
    ];
    const result = mergeRows(live, scheduled, 10);
    expect(result.rows.map((r) => r.id)).toEqual(['l1', 's1', 'l2', 's2']);
    expect(result.hasMore).toBe(false);
    expect(result.scheduledConsumedOnPage).toBe(2);
  });

  test('hasMore is true when combined exceeds pageSize', () => {
    const live = [
      row('l1', 'live', '2024-01-03T00:00:00Z'),
      row('l2', 'live', '2024-01-01T00:00:00Z'),
    ];
    const scheduled = [row('s1', 'scheduled', '2024-01-02T00:00:00Z')];
    const result = mergeRows(live, scheduled, 2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.id)).toEqual(['l1', 's1']);
    expect(result.hasMore).toBe(true);
  });

  test('scheduledOffset skips already-consumed scheduled rows', () => {
    const scheduled = [
      row('s1', 'scheduled', '2024-01-04T00:00:00Z'),
      row('s2', 'scheduled', '2024-01-03T00:00:00Z'),
      row('s3', 'scheduled', '2024-01-02T00:00:00Z'),
      row('s4', 'scheduled', '2024-01-01T00:00:00Z'),
    ];
    const result = mergeRows([], scheduled, 2, 2);
    expect(result.rows.map((r) => r.id)).toEqual(['s3', 's4']);
    expect(result.hasMore).toBe(false);
    expect(result.scheduledConsumedOnPage).toBe(2);
  });

  test('scheduledConsumedOnPage reports correct count for offset computation', () => {
    const live = [row('l1', 'live', '2024-01-05T00:00:00Z')];
    const scheduled = [
      row('s1', 'scheduled', '2024-01-04T00:00:00Z'),
      row('s2', 'scheduled', '2024-01-03T00:00:00Z'),
      row('s3', 'scheduled', '2024-01-02T00:00:00Z'),
    ];
    const result = mergeRows(live, scheduled, 2, 1);
    expect(result.rows.map((r) => r.id)).toEqual(['l1', 's2']);
    expect(result.hasMore).toBe(true);
    expect(result.scheduledConsumedOnPage).toBe(1);
  });

  test('scheduled rows sort by plannedTime, not timestamp', () => {
    const live = [row('l1', 'live', '2024-01-05T00:00:00Z')];
    const scheduled = [
      // timestamp (max @timestamp) is later than l1, but plannedTime is earlier
      row('s1', 'scheduled', '2024-01-06T00:00:00Z', '2024-01-04T00:00:00Z'),
      row('s2', 'scheduled', '2024-01-03T00:00:00Z', '2024-01-02T00:00:00Z'),
    ];
    const result = mergeRows(live, scheduled, 10);
    // s1 sorts by plannedTime (Jan 4) which is before l1 (Jan 5)
    expect(result.rows.map((r) => r.id)).toEqual(['l1', 's1', 's2']);
  });

  test('plannedTime falls back to timestamp for live rows', () => {
    const live = [
      row('l1', 'live', '2024-01-05T00:00:00Z'),
      row('l2', 'live', '2024-01-03T00:00:00Z'),
    ];
    const scheduled = [row('s1', 'scheduled', '2024-01-06T00:00:00Z', '2024-01-04T00:00:00Z')];
    const result = mergeRows(live, scheduled, 10);
    // l1=Jan5, s1 planned=Jan4, l2=Jan3
    expect(result.rows.map((r) => r.id)).toEqual(['l1', 's1', 'l2']);
  });

  test('multi-page simulation: all scheduled rows are reachable', () => {
    const scheduled = [
      row('s1', 'scheduled', '2024-01-10T00:00:00Z'),
      row('s2', 'scheduled', '2024-01-09T00:00:00Z'),
      row('s3', 'scheduled', '2024-01-08T00:00:00Z'),
      row('s4', 'scheduled', '2024-01-07T00:00:00Z'),
      row('s5', 'scheduled', '2024-01-06T00:00:00Z'),
      row('s6', 'scheduled', '2024-01-05T00:00:00Z'),
    ];
    const allIds: string[] = [];
    let offset = 0;

    for (let page = 0; page < 10; page++) {
      const result = mergeRows([], scheduled, 2, offset);
      allIds.push(...result.rows.map((r) => r.id));
      offset += result.scheduledConsumedOnPage;
      if (!result.hasMore) break;
    }

    expect(allIds).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
    expect(new Set(allIds).size).toBe(6);
  });

  test('multi-page simulation: mixed live + scheduled, no duplicates', () => {
    // Simulates the route handler: each page receives different live rows
    // (from search_after advancing) but the same full scheduled array.
    const livePerPage = [
      [
        row('l1', 'live', '2024-01-10T00:00:00Z'),
        row('l2', 'live', '2024-01-07T00:00:00Z'),
        row('l3', 'live', '2024-01-04T00:00:00Z'),
        row('l4', 'live', '2024-01-02T00:00:00Z'),
      ],
      [
        row('l2', 'live', '2024-01-07T00:00:00Z'),
        row('l3', 'live', '2024-01-04T00:00:00Z'),
        row('l4', 'live', '2024-01-02T00:00:00Z'),
      ],
      [row('l3', 'live', '2024-01-04T00:00:00Z'), row('l4', 'live', '2024-01-02T00:00:00Z')],
    ];
    const scheduled = [
      row('s1', 'scheduled', '2024-01-09T00:00:00Z'),
      row('s2', 'scheduled', '2024-01-08T00:00:00Z'),
      row('s3', 'scheduled', '2024-01-06T00:00:00Z'),
      row('s4', 'scheduled', '2024-01-05T00:00:00Z'),
      row('s5', 'scheduled', '2024-01-03T00:00:00Z'),
    ];

    const allIds: string[] = [];
    let offset = 0;

    for (let page = 0; page < 20; page++) {
      const liveRows = livePerPage[page] ?? [];
      const result = mergeRows(liveRows, scheduled, 3, offset);
      allIds.push(...result.rows.map((r) => r.id));
      offset += result.scheduledConsumedOnPage;
      if (!result.hasMore) break;
    }

    expect(allIds).toEqual(['l1', 's1', 's2', 'l2', 's3', 's4', 'l3', 's5', 'l4']);
    expect(new Set(allIds).size).toBe(9);
  });
});
