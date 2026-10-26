/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedHistoryRow } from '../../../common/api/unified_history/types';
import type { MergeResult } from './merge_rows';
import { decodeCursor, encodeCursor, computePaginationCursors } from './cursor_utils';

const makeLiveRow = (overrides: Record<string, unknown> = {}): UnifiedHistoryRow => ({
  id: 'live-1',
  sourceType: 'live' as const,
  source: 'Live' as const,
  timestamp: '2024-06-01',
  queryText: '',
  agentCount: 1,
  successCount: undefined,
  errorCount: undefined,
  totalRows: undefined,
  ...overrides,
});

const makeScheduledRow = (overrides: Record<string, unknown> = {}): UnifiedHistoryRow => ({
  id: 'sched-1',
  sourceType: 'scheduled' as const,
  source: 'Scheduled' as const,
  timestamp: '2024-06-01',
  queryText: '',
  agentCount: 1,
  successCount: undefined,
  errorCount: undefined,
  totalRows: undefined,
  scheduleId: 'sched-1',
  executionCount: 1,
  plannedTime: '2024-06-01T00:00:00.000Z',
  ...overrides,
});

describe('cursor_utils', () => {
  describe('decodeCursor', () => {
    it('returns empty object when undefined', () => {
      expect(decodeCursor(undefined)).toEqual({});
    });

    it('returns empty object when empty string', () => {
      expect(decodeCursor('')).toEqual({});
    });

    it('round-trips with encodeCursor', () => {
      const cursor = {
        actionSearchAfter: [1710936000000, 42],
        scheduledCursor: '2024-06-01T00:00:00.000Z',
        scheduledOffset: 3,
      };
      const encoded = encodeCursor(cursor);
      expect(decodeCursor(encoded)).toEqual(cursor);
    });

    it('returns empty object for invalid base64', () => {
      expect(decodeCursor('not-valid-base64!!!')).toEqual({});
    });

    it('returns empty object when base64 decodes to invalid JSON', () => {
      const invalidJson = Buffer.from('{invalid json').toString('base64');
      expect(decodeCursor(invalidJson)).toEqual({});
    });
  });

  describe('encodeCursor', () => {
    it('produces base64 string', () => {
      const cursor = { actionSearchAfter: [1, 2] };
      const encoded = encodeCursor(cursor);
      expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe(JSON.stringify(cursor));
    });

    it('encodes empty object', () => {
      const encoded = encodeCursor({});
      expect(decodeCursor(encoded)).toEqual({});
    });
  });

  describe('computePaginationCursors', () => {
    const baseParams = {
      decoded: { actionSearchAfter: [1000, 1], scheduledCursor: '2024-01-01', scheduledOffset: 0 },
      scheduledOffset: 0,
    };

    it('uses last live row sort values when available', () => {
      const sortValuesMap = new Map([['action-1', [2000, 2]]]);
      const mergeResult: MergeResult<UnifiedHistoryRow> = {
        rows: [
          makeLiveRow({ id: '1', actionId: 'action-1', timestamp: '2024-06-02' }),
          makeScheduledRow({ id: '2', timestamp: '2024-06-01', plannedTime: '2024-06-01' }),
        ],
        hasMore: true,
        scheduledConsumedOnPage: 1,
      };
      const result = computePaginationCursors({
        ...baseParams,
        mergeResult,
        sortValuesMap,
      });
      expect(result.nextActionSearchAfter).toEqual([2000, 2]);
    });

    it('falls back to decoded when no live row on page', () => {
      const sortValuesMap = new Map();
      const mergeResult: MergeResult<UnifiedHistoryRow> = {
        rows: [makeScheduledRow({ id: '1', timestamp: '2024-06-01', plannedTime: '2024-06-01' })],
        hasMore: true,
        scheduledConsumedOnPage: 1,
      };
      const result = computePaginationCursors({
        ...baseParams,
        mergeResult,
        sortValuesMap,
      });
      expect(result.nextActionSearchAfter).toEqual([1000, 1]);
    });

    it('advances scheduled cursor when last scheduled row has new plannedTime', () => {
      const mergeResult: MergeResult<UnifiedHistoryRow> = {
        rows: [makeScheduledRow({ id: '1', timestamp: '2024-06-02', plannedTime: '2024-06-02' })],
        hasMore: true,
        scheduledConsumedOnPage: 1,
      };
      const result = computePaginationCursors({
        ...baseParams,
        mergeResult,
        sortValuesMap: new Map(),
      });
      expect(result.nextScheduledCursor).toBe('2024-06-02');
      expect(result.nextScheduledOffset).toBe(1);
    });

    it('increments offset when scheduled cursor unchanged', () => {
      const mergeResult: MergeResult<UnifiedHistoryRow> = {
        rows: [
          makeScheduledRow({ id: '1', timestamp: '2024-06-01', plannedTime: '2024-06-01' }),
          makeScheduledRow({ id: '2', timestamp: '2024-06-01', plannedTime: '2024-06-01' }),
        ],
        hasMore: true,
        scheduledConsumedOnPage: 2,
      };
      const result = computePaginationCursors({
        ...baseParams,
        decoded: { ...baseParams.decoded, scheduledCursor: '2024-06-01', scheduledOffset: 0 },
        scheduledOffset: 0,
        mergeResult,
        sortValuesMap: new Map(),
      });
      expect(result.nextScheduledCursor).toBe('2024-06-01');
      expect(result.nextScheduledOffset).toBe(2);
    });
  });
});
