/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduledExecutionBucket, PackSO } from './process_scheduled_history';
import {
  resolvePackFilterForKuery,
  processScheduledHistory,
  getPacksForSpace,
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
    // `doc_count` differs from `agents` so a regression to it cannot pass.
    success_count: { doc_count: 5, agents: { value: 2 } },
    error_count: { doc_count: 3, agents: { value: 1 } },
    ...overrides,
  } as ScheduledExecutionBucket);

const defaultPackAttributes: PackSO['attributes'] = {
  saved_object_id: 'pack-1',
  name: 'Test Pack',
  description: undefined,
  queries: [
    {
      schedule_id: 'schedule-1',
      name: 'uptime',
      id: 'q1',
      query: 'SELECT * FROM uptime',
      interval: 3600,
    },
  ],
  enabled: true,
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: 'elastic',
  updated_at: '2024-01-01T00:00:00.000Z',
  updated_by: 'elastic',
  shards: [],
  references: [],
};

const createMockPackSO = (
  overrides: { id?: string; attributes?: Partial<PackSO['attributes']> } = {}
): PackSO => ({
  id: overrides.id ?? 'pack-1',
  attributes: { ...defaultPackAttributes, ...overrides.attributes },
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
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ perPage: 1000 }));
    });
  });

  describe('resolvePackFilterForKuery', () => {
    it('returns packIds when pack name matches', () => {
      const packSOs = [
        createMockPackSO({ id: 'pack-1', attributes: { name: 'uptime pack', queries: [] } }),
        createMockPackSO({ id: 'pack-2', attributes: { name: 'uptime checks', queries: [] } }),
      ];

      const result = resolvePackFilterForKuery(packSOs, 'uptime');

      expect(result.packIds).toEqual(['pack-1', 'pack-2']);
    });

    it('returns scheduleIds when query matches', () => {
      const packSOs = [
        createMockPackSO({
          attributes: {
            name: 'My Pack',
            queries: [
              { schedule_id: 'sched-1', name: 'uptime', id: 'q1', query: 'select 1', interval: 60 },
              { schedule_id: 'sched-2', name: 'os', id: 'q2', query: 'select 2', interval: 60 },
            ],
          },
        }),
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

    it('prefers agent cardinality over document counts for success and error', () => {
      // Many documents from few agents: the badges must report agents, not docs.
      const bucket = createMockBucket({
        agent_count: { value: 2 },
        success_count: { doc_count: 21, agents: { value: 2 } },
        error_count: { doc_count: 4, agents: { value: 1 } },
      });

      const result = processScheduledHistory({
        scheduledBuckets: [bucket],
        packSOs: [createMockPackSO()],
        spaceId: 'default',
      });

      expect(result[0].successCount).toBe(2);
      expect(result[0].errorCount).toBe(1);
    });

    it('reports zero rather than doc counts when cardinality sub-aggregations are absent', () => {
      // A `doc_count` fallback would report documents as agents.
      const bucket = createMockBucket({
        success_count: { doc_count: 7 },
        error_count: { doc_count: 3 },
      });

      const result = processScheduledHistory({
        scheduledBuckets: [bucket],
        packSOs: [createMockPackSO()],
        spaceId: 'default',
      });

      expect(result[0].successCount).toBe(0);
      expect(result[0].errorCount).toBe(0);
    });

    it('keeps a zero agent cardinality instead of falling through to doc_count', () => {
      // `??` must not treat a legitimate 0 as missing, the way `||` would.
      const bucket = createMockBucket({
        success_count: { doc_count: 12, agents: { value: 0 } },
        error_count: { doc_count: 5, agents: { value: 0 } },
      });

      const result = processScheduledHistory({
        scheduledBuckets: [bucket],
        packSOs: [createMockPackSO()],
        spaceId: 'default',
      });

      expect(result[0].successCount).toBe(0);
      expect(result[0].errorCount).toBe(0);
    });

    it('returns empty array when no buckets', () => {
      const result = processScheduledHistory({
        scheduledBuckets: [],
        packSOs: [],
        spaceId: 'default',
      });

      expect(result).toHaveLength(0);
    });

    it('falls back to response doc labels when the pack is not in this space', () => {
      const bucket = createMockBucket({
        pack_id: { buckets: [{ key: 'remote-pack-1', doc_count: 5 }] },
        pack_name: { buckets: [{ key: 'Remote Pack', doc_count: 5 }] },
        query_name: { buckets: [{ key: 'remote_uptime', doc_count: 5 }] },
      });

      const result = processScheduledHistory({
        scheduledBuckets: [bucket],
        packSOs: [],
        spaceId: 'default',
      });

      expect(result[0].packId).toBe('remote-pack-1');
      expect(result[0].packName).toBe('Remote Pack');
      expect(result[0].queryName).toBe('remote_uptime');
      expect(result[0].queryText).toBe('');
    });

    it('prefers the pack saved object over response doc labels', () => {
      const bucket = createMockBucket({
        pack_id: { buckets: [{ key: 'remote-pack-1', doc_count: 5 }] },
        pack_name: { buckets: [{ key: 'Remote Pack', doc_count: 5 }] },
        query_name: { buckets: [{ key: 'remote_uptime', doc_count: 5 }] },
      });

      const result = processScheduledHistory({
        scheduledBuckets: [bucket],
        packSOs: [createMockPackSO()],
        spaceId: 'default',
      });

      expect(result[0].packName).toBe('Test Pack');
      expect(result[0].queryName).toBe('uptime');
      expect(result[0].queryText).toBe('SELECT * FROM uptime');
    });

    it('leaves labels undefined when neither source has them', () => {
      const result = processScheduledHistory({
        scheduledBuckets: [createMockBucket()],
        packSOs: [],
        spaceId: 'default',
      });

      expect(result[0].packName).toBeUndefined();
      expect(result[0].queryName).toBeUndefined();
      expect(result[0].queryText).toBe('');
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
