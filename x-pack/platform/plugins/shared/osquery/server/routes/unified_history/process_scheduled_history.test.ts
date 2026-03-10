/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractPackIdFromBucket,
  resolvePackFilterForKuery,
  processScheduledHistory,
  ScheduledExecutionBucket,
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

describe('process_scheduled_history', () => {
  describe('extractPackIdFromBucket', () => {
    it('returns pack_id from pack_id_hit when present', () => {
      const bucket = createMockBucket({
        pack_id_hit: {
          hits: {
            hits: [{ _source: { pack_id: 'pack-123' } }],
          },
        },
      });
      expect(extractPackIdFromBucket(bucket)).toBe('pack-123');
    });

    it('returns undefined when pack_id_hit is absent', () => {
      const bucket = createMockBucket();
      expect(extractPackIdFromBucket(bucket)).toBeUndefined();
    });

    it('returns undefined when pack_id_hit has no hits', () => {
      const bucket = createMockBucket({
        pack_id_hit: { hits: { hits: [] } },
      });
      expect(extractPackIdFromBucket(bucket)).toBeUndefined();
    });
  });

  describe('resolvePackFilterForKuery', () => {
    it('returns packIds when pack name matches', async () => {
      const packObjects = [
        { id: 'pack-1', attributes: { name: 'uptime pack', queries: [] } },
        { id: 'pack-2', attributes: { name: 'uptime checks', queries: [] } },
      ];
      const mockFind = jest.fn().mockResolvedValueOnce({ saved_objects: packObjects });
      const mockClient = {
        find: mockFind,
        bulkGet: jest.fn(),
      } as never;

      const result = await resolvePackFilterForKuery(mockClient, 'uptime');

      expect(result.packIds).toEqual(['pack-1', 'pack-2']);
      expect(mockFind).toHaveBeenCalledTimes(1);
    });

    it('returns scheduleIds when query matches', async () => {
      const mockClient = {
        find: jest.fn().mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'pack-1',
              attributes: {
                name: 'My Pack',
                queries: [
                  { schedule_id: 'sched-1', name: 'uptime', id: 'q1', query: 'select 1' },
                  { schedule_id: 'sched-2', name: 'os', id: 'q2', query: 'select 2' },
                ],
              },
            },
          ],
        }),
        bulkGet: jest.fn(),
      } as never;

      const result = await resolvePackFilterForKuery(mockClient, 'uptime');

      expect(result.scheduleIds).toContain('sched-1');
    });
  });

  describe('processScheduledHistory', () => {
    it('maps buckets to ScheduledHistoryRow', async () => {
      const bucket = createMockBucket({
        pack_id_hit: {
          hits: {
            hits: [{ _source: { pack_id: 'pack-1' } }],
          },
        },
      });

      const mockBulkGet = jest.fn().mockResolvedValue({
        saved_objects: [
          {
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
            },
          },
        ],
      });

      const mockClient = {
        find: jest.fn(),
        bulkGet: mockBulkGet,
      } as never;

      const result = await processScheduledHistory({
        scheduledBuckets: [bucket],
        spaceScopedClient: mockClient,
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

    it('returns empty array when no buckets', async () => {
      const mockBulkGet = jest.fn();
      const mockClient = { find: jest.fn(), bulkGet: mockBulkGet } as never;

      const result = await processScheduledHistory({
        scheduledBuckets: [],
        spaceScopedClient: mockClient,
        spaceId: 'default',
      });

      expect(result).toHaveLength(0);
      expect(mockBulkGet).not.toHaveBeenCalled();
    });
  });
});
