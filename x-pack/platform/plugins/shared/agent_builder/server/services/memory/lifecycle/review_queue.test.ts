/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReviewQueue, reviewQueueIndexName } from './review_queue';
import type { ReviewItem, ReviewReason } from './review_queue';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';

// ---------------------------------------------------------------------------
// Helpers / mocks
// ---------------------------------------------------------------------------

const makeEsClient = (): jest.Mocked<ElasticsearchClient> =>
  ({
    indices: {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
    index: jest.fn().mockResolvedValue({ result: 'created' }),
    search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
    count: jest.fn().mockResolvedValue({ count: 0 }),
  } as unknown as jest.Mocked<ElasticsearchClient>);

const makeHit = (
  id: string,
  source: Omit<ReviewItem, 'id'>
): { _id: string; _source: Omit<ReviewItem, 'id'> } => ({
  _id: id,
  _source: source,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReviewQueue', () => {
  let queue: ReviewQueue;
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = makeEsClient();
    queue = new ReviewQueue({ logger, esClient });
  });

  // ---- initialize ----

  describe('initialize', () => {
    it('creates the index when it does not exist', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValue(false);
      await queue.initialize();
      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: reviewQueueIndexName })
      );
    });

    it('skips creation when index already exists', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValue(true);
      await queue.initialize();
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('sets mapping with correct fields', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValue(false);
      await queue.initialize();
      const call = (esClient.indices.create as jest.Mock).mock.calls[0][0];
      const props = call.mappings.properties;
      expect(props).toHaveProperty('memory_id');
      expect(props).toHaveProperty('reason');
      expect(props).toHaveProperty('priority');
      expect(props).toHaveProperty('enqueued_at');
      expect(props).toHaveProperty('notes');
    });
  });

  // ---- enqueue ----

  describe('enqueue', () => {
    it('calls esClient.index with correct document structure', async () => {
      await queue.enqueue('mem-123', 'outdated', 7);

      expect(esClient.index).toHaveBeenCalledTimes(1);
      const call = (esClient.index as jest.Mock).mock.calls[0][0];
      expect(call.index).toBe(reviewQueueIndexName);
      expect(call.document.memory_id).toBe('mem-123');
      expect(call.document.reason).toBe('outdated');
      expect(call.document.priority).toBe(7);
      expect(call.document.enqueued_at).toBeDefined();
      expect(call.refresh).toBe('wait_for');
    });

    it('uses default priority of 5 when not specified', async () => {
      await queue.enqueue('mem-abc', 'incorrect');
      const call = (esClient.index as jest.Mock).mock.calls[0][0];
      expect(call.document.priority).toBe(5);
    });

    it('clamps priority to minimum 1', async () => {
      await queue.enqueue('mem-x', 'duplicate_merge_candidate', 0);
      const call = (esClient.index as jest.Mock).mock.calls[0][0];
      expect(call.document.priority).toBe(1);
    });

    it('clamps priority to maximum 10', async () => {
      await queue.enqueue('mem-x', 'needs_update', 99);
      const call = (esClient.index as jest.Mock).mock.calls[0][0];
      expect(call.document.priority).toBe(10);
    });

    it('includes notes in document when provided', async () => {
      await queue.enqueue('mem-x', 'outdated', 5, 'superseded by new fact');
      const call = (esClient.index as jest.Mock).mock.calls[0][0];
      expect(call.document.notes).toBe('superseded by new fact');
    });

    it('omits notes field when not provided', async () => {
      await queue.enqueue('mem-x', 'outdated');
      const call = (esClient.index as jest.Mock).mock.calls[0][0];
      expect(call.document.notes).toBeUndefined();
    });

    it('accepts all ReviewReason values', async () => {
      const reasons: ReviewReason[] = [
        'outdated',
        'incorrect',
        'duplicate_merge_candidate',
        'needs_update',
        'deprecated_candidate',
      ];
      for (const reason of reasons) {
        await queue.enqueue('mem-x', reason);
        const call = (esClient.index as jest.Mock).mock.calls.at(-1)![0];
        expect(call.document.reason).toBe(reason);
      }
    });
  });

  // ---- dequeue ----

  describe('dequeue', () => {
    it('returns empty array when no items are pending', async () => {
      (esClient.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });
      const items = await queue.dequeue(10);
      expect(items).toEqual([]);
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('returns items mapped from ES hits', async () => {
      const source1: Omit<ReviewItem, 'id'> = {
        memory_id: 'mem-a',
        reason: 'outdated',
        priority: 8,
        enqueued_at: '2025-06-01T00:00:00.000Z',
      };
      const source2: Omit<ReviewItem, 'id'> = {
        memory_id: 'mem-b',
        reason: 'incorrect',
        priority: 5,
        enqueued_at: '2025-05-30T00:00:00.000Z',
      };

      (esClient.search as jest.Mock).mockResolvedValue({
        hits: { hits: [makeHit('id-1', source1), makeHit('id-2', source2)] },
      });

      const items = await queue.dequeue(10);
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('id-1');
      expect(items[0].memory_id).toBe('mem-a');
      expect(items[0].reason).toBe('outdated');
      expect(items[0].priority).toBe(8);
      expect(items[1].id).toBe('id-2');
      expect(items[1].memory_id).toBe('mem-b');
    });

    it('deletes dequeued items from ES', async () => {
      const source: Omit<ReviewItem, 'id'> = {
        memory_id: 'mem-z',
        reason: 'needs_update',
        priority: 6,
        enqueued_at: '2025-06-01T00:00:00.000Z',
      };

      (esClient.search as jest.Mock).mockResolvedValue({
        hits: { hits: [makeHit('hit-id-1', source)] },
      });

      await queue.dequeue(5);

      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: reviewQueueIndexName,
          query: { ids: { values: ['hit-id-1'] } },
        })
      );
    });

    it('passes limit as size to ES search', async () => {
      (esClient.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });
      await queue.dequeue(42);
      const call = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(call.size).toBe(42);
    });

    it('uses default limit of 20 when not specified', async () => {
      (esClient.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });
      await queue.dequeue();
      const call = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(call.size).toBe(20);
    });

    it('sorts by priority desc then enqueued_at asc', async () => {
      (esClient.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });
      await queue.dequeue(10);
      const call = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(call.sort).toEqual([
        { priority: { order: 'desc' } },
        { enqueued_at: { order: 'asc' } },
      ]);
    });
  });

  // ---- size ----

  describe('size', () => {
    it('returns 0 when queue is empty', async () => {
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
      const count = await queue.size();
      expect(count).toBe(0);
    });

    it('returns correct count from ES', async () => {
      (esClient.count as jest.Mock).mockResolvedValue({ count: 7 });
      const count = await queue.size();
      expect(count).toBe(7);
    });

    it('queries the correct index', async () => {
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
      await queue.size();
      const call = (esClient.count as jest.Mock).mock.calls[0][0];
      expect(call.index).toBe(reviewQueueIndexName);
    });
  });
});
