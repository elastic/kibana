/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resolvePackFilterForKuery,
  processScheduledHistory,
  getPacksForSpace,
  ScheduledExecutionBucket,
  PackSO,
} from './process_scheduled_history';

const createMockBucket = (
  overrides: Partial<ScheduledExecutionBucket> = {}
): ScheduledExecutionBucket =>
  ({
    key: ['schedule-1', 1],
    key_as_string: 'schedule-1|1',
    doc_count: 5,
    planned_time: { value: 1710936000000, value_as_string: '2024-03-20T12:00:00.000Z' },
    max_timestamp: { value: 1710936100000, value_as_string: '2024-03-20T12:01:40.000Z' },
    agent_count: { value: 3 },
    total_rows: { value: 15 },
    success_count: { doc_count: 2 },
    error_count: { doc_count: 1 },
    ...overrides,
  } as ScheduledExecutionBucket);

const createMockPackSO = (overrides: Partial<PackSO> = {}): PackSO => ({
  id: 'pack-1',
  attributes: {
    name: 'Test Pack',
    queries: [
      {
        schedule_id: 'schedule-1',
        name: 'uptime',
        id: 'q1',
        query: 'SELECT * FROM uptime',
      },
    ],
  } as PackSO['attributes'],
  ...overrides,
});

describe('process_scheduled_history', () => {
  describe('getPacksForSpace', () => {
    it('fetches all packs and maps to PackSO shape', async () => {
      const mockFind = jest.fn().mockResolvedValue({
        saved_objects: [
          { id: 'pack-1', attributes: { name: 'Pack 1', queries: [] } },
          { id: 'pack-2', attributes: { name: 'Pack 2', queries: [] } },
        ],
      });
      const mockClient = { find: mockFind } as never;

      const result = await getPacksForSpace(mockClient);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'pack-1', attributes: { name: 'Pack 1', queries: [] } });
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ perPage: 1000 })
      );
    });
  });

  describe('resolvePackFilterForKuery', () => {
    it('returns packIds when pack name matches', () => {
      const packSOs: PackSO[] = [
        { id: 'pack-1', attributes: { name: 'uptime pack', queries: [] } as PackSO['attributes'] },
        {
          id: 'pack-2',
          attributes: { name: 'uptime checks', queries: [] } as PackSO['attributes'],
        },
      ];

      const result = resolvePackFilterForKuery(packSOs, 'uptime');

      expect(result.packIds).toEqual(['pack-1', 'pack-2']);
    });

    it('returns scheduleIds when query matches', () => {
      const packSOs: PackSO[] = [
        {
          id: 'pack-1',
          attributes: {
            name: 'My Pack',
            queries: [
              { schedule_id: 'sched-1', name: 'uptime', id: 'q1', query: 'select 1' },
              { schedule_id: 'sched-2', name: 'os', id: 'q2', query: 'select 2' },
            ],
          } as PackSO['attributes'],
        },
      ];

      const result = resolvePackFilterForKuery(packSOs, 'uptime');

      expect(result.scheduleIds).toContain('sched-1');
    });
  });

  describe('processScheduledHistory', () => {
    it('maps buckets to ScheduledHistoryRow using pack lookup', () => {
      const bucket = createMockBucket();
      const packSOs = [createMockPackSO()];

      const result = processScheduledHistory({
        scheduledBuckets: [bucket],
        packSOs,
        spaceId: 'default',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('schedule-1_1');
      expect(result[0].sourceType).toBe('scheduled');
      expect(result[0].source).toBe('Scheduled');
      expect(result[0].scheduleId).toBe('schedule-1');
      expect(result[0].executionCount).toBe(1);
      expect(result[0].agentCount).toBe(3);
      expect(result[0].totalRows).toBe(15);
      expect(result[0].successCount).toBe(2);
      expect(result[0].errorCount).toBe(1);
      expect(result[0].queryText).toBe('SELECT * FROM uptime');
      expect(result[0].packName).toBe('Test Pack');
    });

    it('returns empty array when no buckets', () => {
      const result = processScheduledHistory({
        scheduledBuckets: [],
        packSOs: [],
        spaceId: 'default',
      });

      expect(result).toHaveLength(0);
    });

    it('resolves names even without pack_id in response docs', () => {
      const bucket = createMockBucket();
      const packSOs = [createMockPackSO()];

      const result = processScheduledHistory({
        scheduledBuckets: [bucket],
        packSOs,
        spaceId: 'default',
      });

      expect(result[0].queryName).toBe('uptime');
      expect(result[0].packName).toBe('Test Pack');
      expect(result[0].packId).toBe('pack-1');
    });
  });
});
