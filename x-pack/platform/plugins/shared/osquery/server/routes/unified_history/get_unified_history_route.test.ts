/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the merge and pagination logic used by the unified history route handler.
 *
 * The route handler itself requires a full Kibana router context and is covered by
 * integration / E2E tests. Here we isolate and test the core algorithm: merging two
 * independently fetched streams of rows (live actions and scheduled executions) into a
 * single time-ordered page and computing the per-source cursors that allow the client
 * to fetch the next page without re-fetching rows already seen.
 */

import { mergeRows } from './merge_rows';
import type { MergeableRow } from './merge_rows';

// ---------------------------------------------------------------------------
// Helpers for building fixture rows
// ---------------------------------------------------------------------------

const makeLiveRow = (id: string, timestamp: string): MergeableRow => ({
  id,
  rowType: 'live',
  timestamp,
});

const makeScheduledRow = (id: string, timestamp: string): MergeableRow => ({
  id,
  rowType: 'scheduled',
  timestamp,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('unified history merge logic', () => {
  describe('sorting', () => {
    test('merges live and scheduled rows sorted by timestamp descending', () => {
      const live = [
        makeLiveRow('live-1', '2024-01-03T00:00:00.000Z'),
        makeLiveRow('live-2', '2024-01-01T00:00:00.000Z'),
      ];
      const scheduled = [
        makeScheduledRow('sched-1', '2024-01-04T00:00:00.000Z'),
        makeScheduledRow('sched-2', '2024-01-02T00:00:00.000Z'),
      ];

      const result = mergeRows(live, scheduled, 10);

      expect(result.rows.map((r) => r.id)).toEqual(['sched-1', 'live-1', 'sched-2', 'live-2']);
    });

    test('rows with the same timestamp preserve the relative order of the two input arrays', () => {
      // Both rows share the same timestamp — live comes first because it was first in the
      // concatenated array before sorting (sort is stable in V8).
      const live = [makeLiveRow('live-1', '2024-01-01T00:00:00.000Z')];
      const scheduled = [makeScheduledRow('sched-1', '2024-01-01T00:00:00.000Z')];

      const result = mergeRows(live, scheduled, 10);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe('live-1');
      expect(result.rows[1].id).toBe('sched-1');
    });
  });

  describe('pagination — slicing', () => {
    test('slices merged results to pageSize', () => {
      const live = Array.from({ length: 15 }, (_, i) =>
        makeLiveRow(`live-${i}`, `2024-01-${String(15 - i).padStart(2, '0')}T00:00:00.000Z`)
      );
      const scheduled = Array.from({ length: 15 }, (_, i) =>
        makeScheduledRow(`sched-${i}`, `2024-01-${String(15 - i).padStart(2, '0')}T12:00:00.000Z`)
      );

      const result = mergeRows(live, scheduled, 20);

      expect(result.rows).toHaveLength(20);
    });

    test('hasMore is true when total row count exceeds pageSize', () => {
      const live = Array.from({ length: 11 }, (_, i) =>
        makeLiveRow(`live-${i}`, `2024-01-${String(20 - i).padStart(2, '0')}T00:00:00.000Z`)
      );

      const result = mergeRows(live, [], 10);

      expect(result.hasMore).toBe(true);
    });

    test('hasMore is false when total row count fits within pageSize', () => {
      const live = [makeLiveRow('live-1', '2024-01-02T00:00:00.000Z')];
      const scheduled = [makeScheduledRow('sched-1', '2024-01-01T00:00:00.000Z')];

      const result = mergeRows(live, scheduled, 10);

      expect(result.hasMore).toBe(false);
    });

    test('hasMore is false when total row count exactly equals pageSize', () => {
      const live = Array.from({ length: 5 }, (_, i) =>
        makeLiveRow(`live-${i}`, `2024-01-${String(10 - i).padStart(2, '0')}T00:00:00.000Z`)
      );
      const scheduled = Array.from({ length: 5 }, (_, i) =>
        makeScheduledRow(`sched-${i}`, `2024-01-${String(5 - i).padStart(2, '0')}T00:00:00.000Z`)
      );

      const result = mergeRows(live, scheduled, 10);

      expect(result.hasMore).toBe(false);
    });
  });

  describe('cursor computation', () => {
    test('computes per-source cursors from the last consumed item of each type', () => {
      // pageSize=4 — the merged slice contains 2 live and 2 scheduled rows.
      // The last live row in the slice is live-1 (older), and the last scheduled row is sched-1.
      const live = [
        makeLiveRow('live-0', '2024-01-04T00:00:00.000Z'),
        makeLiveRow('live-1', '2024-01-02T00:00:00.000Z'),
        makeLiveRow('live-overflow', '2024-01-01T00:00:00.000Z'), // pushed out of page
      ];
      const scheduled = [
        makeScheduledRow('sched-0', '2024-01-03T00:00:00.000Z'),
        makeScheduledRow('sched-1', '2024-01-01T12:00:00.000Z'),
        makeScheduledRow('sched-overflow', '2023-12-31T00:00:00.000Z'), // pushed out of page
      ];

      const result = mergeRows(live, scheduled, 4);

      // Merged (desc): live-0 (Jan 4), sched-0 (Jan 3), live-1 (Jan 2), sched-1 (Jan 1 noon)
      expect(result.rows.map((r) => r.id)).toEqual(['live-0', 'sched-0', 'live-1', 'sched-1']);
      // Cursors point to the timestamp of the last item of each type within the slice
      expect(result.nextActionsCursor).toBe('2024-01-02T00:00:00.000Z');
      expect(result.nextScheduledCursor).toBe('2024-01-01T12:00:00.000Z');
    });

    test('cursors are undefined when hasMore is false', () => {
      const live = [makeLiveRow('live-1', '2024-01-02T00:00:00.000Z')];
      const scheduled = [makeScheduledRow('sched-1', '2024-01-01T00:00:00.000Z')];

      const result = mergeRows(live, scheduled, 10);

      expect(result.hasMore).toBe(false);
      expect(result.nextActionsCursor).toBeUndefined();
      expect(result.nextScheduledCursor).toBeUndefined();
    });

    test('nextScheduledCursor is undefined when no scheduled rows appear in the page', () => {
      // All slots taken by live rows — no scheduled row in the consumed slice.
      const live = Array.from({ length: 11 }, (_, i) =>
        makeLiveRow(`live-${i}`, `2024-01-${String(20 - i).padStart(2, '0')}T00:00:00.000Z`)
      );

      const result = mergeRows(live, [], 10);

      expect(result.hasMore).toBe(true);
      expect(result.nextActionsCursor).toBeDefined();
      expect(result.nextScheduledCursor).toBeUndefined();
    });

    test('nextActionsCursor is undefined when no live rows appear in the page', () => {
      const scheduled = Array.from({ length: 11 }, (_, i) =>
        makeScheduledRow(`sched-${i}`, `2024-01-${String(20 - i).padStart(2, '0')}T00:00:00.000Z`)
      );

      const result = mergeRows([], scheduled, 10);

      expect(result.hasMore).toBe(true);
      expect(result.nextScheduledCursor).toBeDefined();
      expect(result.nextActionsCursor).toBeUndefined();
    });
  });

  describe('single-source inputs', () => {
    test('works with only live rows and no scheduled rows', () => {
      const live = [
        makeLiveRow('live-0', '2024-01-02T00:00:00.000Z'),
        makeLiveRow('live-1', '2024-01-01T00:00:00.000Z'),
      ];

      const result = mergeRows(live, [], 10);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe('live-0');
      expect(result.rows[1].id).toBe('live-1');
      expect(result.hasMore).toBe(false);
    });

    test('works with only scheduled rows and no live rows', () => {
      const scheduled = [
        makeScheduledRow('sched-0', '2024-01-02T00:00:00.000Z'),
        makeScheduledRow('sched-1', '2024-01-01T00:00:00.000Z'),
      ];

      const result = mergeRows([], scheduled, 10);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe('sched-0');
      expect(result.rows[1].id).toBe('sched-1');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('empty inputs', () => {
    test('returns empty results when both inputs are empty', () => {
      const result = mergeRows([], [], 20);

      expect(result.rows).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextActionsCursor).toBeUndefined();
      expect(result.nextScheduledCursor).toBeUndefined();
    });
  });

  describe('offset-based scheduled pagination', () => {
    /**
     * ES returns up to 1000 scheduled buckets via multi_terms. The route uses
     * lte: (inclusive) cursor + scheduledOffset to page through co-temporal
     * executions without losing rows.
     */
    test('many concurrent scheduled executions at the same timestamp are paged via offset', () => {
      const PAGE_SIZE = 20;
      const SAME_TIMESTAMP = '2024-06-15T08:00:00.000Z';
      const TOTAL_SCHEDULED = 50;

      // ES returns all 50 buckets (well within the 1000 limit)
      const allScheduledFromES = Array.from({ length: TOTAL_SCHEDULED }, (_, i) =>
        makeScheduledRow(`sched-${i}`, SAME_TIMESTAMP)
      );

      // Page 1: offset=0, show first 20
      const page1 = mergeRows([], allScheduledFromES, PAGE_SIZE, 0);
      expect(page1.rows).toHaveLength(PAGE_SIZE);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextScheduledCursor).toBe(SAME_TIMESTAMP);
      expect(page1.nextScheduledOffset).toBe(20);

      // Page 2: same ES result, offset=20, show next 20
      const page2 = mergeRows([], allScheduledFromES, PAGE_SIZE, page1.nextScheduledOffset!);
      expect(page2.rows).toHaveLength(PAGE_SIZE);
      expect(page2.hasMore).toBe(true);
      expect(page2.nextScheduledOffset).toBe(40);

      // Page 3: offset=40, show last 10
      const page3 = mergeRows([], allScheduledFromES, PAGE_SIZE, page2.nextScheduledOffset!);
      expect(page3.rows).toHaveLength(10);
      expect(page3.hasMore).toBe(false);
      expect(page3.nextScheduledOffset).toBeUndefined();

      // Total across all pages = all 50 executions
      const totalSeen = page1.rows.length + page2.rows.length + page3.rows.length;
      expect(totalSeen).toBe(TOTAL_SCHEDULED);

      // All IDs are unique
      const allIds = [
        ...page1.rows.map((r) => r.id),
        ...page2.rows.map((r) => r.id),
        ...page3.rows.map((r) => r.id),
      ];
      expect(new Set(allIds).size).toBe(TOTAL_SCHEDULED);
    });

    test('offset defaults to 0 when not provided', () => {
      const rows = Array.from({ length: 5 }, (_, i) =>
        makeScheduledRow(`sched-${i}`, '2024-01-01T00:00:00.000Z')
      );

      const result = mergeRows([], rows, 10);
      expect(result.rows).toHaveLength(5);
    });

    test('offset accumulates correctly across pages with mixed live and scheduled rows', () => {
      const SAME_TIMESTAMP = '2024-06-15T08:00:00.000Z';
      const allScheduled = Array.from({ length: 10 }, (_, i) =>
        makeScheduledRow(`sched-${i}`, SAME_TIMESTAMP)
      );
      const live = [
        makeLiveRow('live-0', '2024-06-15T09:00:00.000Z'), // newer than scheduled
      ];

      // Page 1: pageSize=5, offset=0 → 1 live + 4 scheduled
      const page1 = mergeRows(live, allScheduled, 5, 0);
      expect(page1.rows).toHaveLength(5);
      expect(page1.hasMore).toBe(true);
      const scheduledOnPage1 = page1.rows.filter((r) => r.rowType === 'scheduled').length;
      expect(scheduledOnPage1).toBe(4);
      expect(page1.nextScheduledOffset).toBe(4);

      // Page 2: offset=4, no more live rows → 5 scheduled
      const page2 = mergeRows([], allScheduled, 5, page1.nextScheduledOffset!);
      expect(page2.rows).toHaveLength(5);
      expect(page2.hasMore).toBe(true);
      expect(page2.nextScheduledOffset).toBe(9);

      // Page 3: offset=9 → 1 remaining scheduled
      const page3 = mergeRows([], allScheduled, 5, page2.nextScheduledOffset!);
      expect(page3.rows).toHaveLength(1);
      expect(page3.hasMore).toBe(false);
    });
  });
});
