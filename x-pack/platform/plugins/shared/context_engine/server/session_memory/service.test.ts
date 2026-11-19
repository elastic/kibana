/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { MAX_SESSION_MEMORY_FORGET_IDS } from '../../common/constants';
import { SESSION_MEMORY_DATA_STREAM } from './data_streams';
import { createSessionMemoryService } from './service';
import type { StoredSessionMemory } from './types';

const NOW = new Date('2026-11-09T10:00:00.000Z');
const scope = { space: 'default', userId: 'jdoe' };

const bulkResponse = (items: BulkResponse['items'] = []): BulkResponse => ({
  errors: items.some((item) => item.create?.error),
  took: 1,
  items,
});

const searchResponse = (sources: StoredSessionMemory[]): SearchResponse<StoredSessionMemory> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: {
    hits: sources.map((_source, index) => ({ _index: '.ds-memory', _id: `doc-${index}`, _source })),
  },
});

const storedMemory: StoredSessionMemory = {
  '@timestamp': '2026-11-09T09:00:00.000Z',
  id: 'memory-1',
  space: 'default',
  session_id: 'session-1',
  user_id: 'jdoe',
  ai_index_id: ['ops-memory'],
  content: 'checkout-service latency comes from the connection pool limit',
  attributes: { incident: 'INC-4211' },
};

const forgottenMemory: StoredSessionMemory = {
  '@timestamp': '2026-11-09T09:30:00.000Z',
  id: 'memory-2',
  space: 'default',
  session_id: 'session-1',
  user_id: 'jdoe',
  ai_index_id: ['ops-memory'],
  deleted_at: '2026-11-09T09:30:00.000Z',
};

describe('createSessionMemoryService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const service = createSessionMemoryService(esClient);

  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    esClient.bulk.mockResolvedValue(bulkResponse());
  });

  describe('remember', () => {
    it('writes a new memory under a generated id, in the caller scope', async () => {
      const result = await service.remember(scope, {
        sessionId: 'session-1',
        content: 'checkout-service latency comes from the connection pool limit',
      });

      expect(result).toEqual({ id: expect.any(String) });
      expect(esClient.index).toHaveBeenCalledWith({
        index: SESSION_MEMORY_DATA_STREAM,
        op_type: 'create',
        require_data_stream: true,
        document: {
          '@timestamp': NOW.toISOString(),
          id: result.id,
          space: 'default',
          session_id: 'session-1',
          user_id: 'jdoe',
          ai_index_id: [],
          content: 'checkout-service latency comes from the connection pool limit',
          attributes: {},
        },
      });
    });

    it('writes a revision as a full document under the given id', async () => {
      const result = await service.remember(scope, {
        id: 'memory-1',
        sessionId: 'session-2',
        content: 'the pool limit was raised in 3.2.1',
        aiIndexIds: ['ops-memory'],
        attributes: { incident: 'INC-4211' },
      });

      expect(result).toEqual({ id: 'memory-1' });
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            id: 'memory-1',
            session_id: 'session-2',
            ai_index_id: ['ops-memory'],
            content: 'the pool limit was raised in 3.2.1',
            attributes: { incident: 'INC-4211' },
          }),
        })
      );
    });
  });

  describe('get', () => {
    it('returns the latest revision of the memory in the caller scope', async () => {
      esClient.search.mockResolvedValue(searchResponse([storedMemory]));

      await expect(service.get(scope, 'memory-1')).resolves.toEqual({
        id: 'memory-1',
        sessionId: 'session-1',
        userId: 'jdoe',
        aiIndexIds: ['ops-memory'],
        content: 'checkout-service latency comes from the connection pool limit',
        attributes: { incident: 'INC-4211' },
        revisedAt: '2026-11-09T09:00:00.000Z',
      });
      expect(esClient.search).toHaveBeenCalledWith({
        index: SESSION_MEMORY_DATA_STREAM,
        ignore_unavailable: true,
        allow_partial_search_results: false,
        query: {
          bool: {
            filter: [
              { term: { id: 'memory-1' } },
              { term: { space: 'default' } },
              { term: { user_id: 'jdoe' } },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        size: 1,
      });
    });

    it('returns undefined when no memory matches', async () => {
      esClient.search.mockResolvedValue(searchResponse([]));

      await expect(service.get(scope, 'memory-1')).resolves.toBeUndefined();
    });

    it('returns undefined when the latest revision is a tombstone', async () => {
      esClient.search.mockResolvedValue(searchResponse([forgottenMemory]));

      await expect(service.get(scope, 'memory-2')).resolves.toBeUndefined();
    });
  });

  describe('forget', () => {
    it('tombstones each live memory and reports what happened to every id', async () => {
      esClient.search.mockResolvedValue(searchResponse([storedMemory, forgottenMemory]));

      await expect(
        service.forget(scope, ['memory-1', 'memory-2', 'memory-3', 'memory-1'])
      ).resolves.toEqual([
        { id: 'memory-1', outcome: 'forgotten' },
        { id: 'memory-2', outcome: 'already_forgotten' },
        { id: 'memory-3', outcome: 'not_found' },
      ]);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ allow_partial_search_results: false })
      );
      expect(esClient.bulk).toHaveBeenCalledWith({
        require_data_stream: true,
        operations: [
          { create: { _index: SESSION_MEMORY_DATA_STREAM } },
          {
            '@timestamp': NOW.toISOString(),
            id: 'memory-1',
            space: 'default',
            session_id: 'session-1',
            user_id: 'jdoe',
            ai_index_id: ['ops-memory'],
            deleted_at: NOW.toISOString(),
          },
        ],
      });
    });

    it('reports a rejected tombstone with its cause and keeps every other outcome', async () => {
      const otherMemory = { ...storedMemory, id: 'memory-4' };
      esClient.search.mockResolvedValue(
        searchResponse([storedMemory, otherMemory, forgottenMemory])
      );
      esClient.bulk.mockResolvedValue(
        bulkResponse([
          { create: { _index: '.ds-memory', status: 201 } },
          {
            create: {
              _index: '.ds-memory',
              status: 429,
              error: {
                type: 'es_rejected_execution_exception',
                reason: 'rejected execution',
                caused_by: { type: 'queue_full', reason: 'write queue full' },
              },
            },
          },
        ])
      );

      await expect(
        service.forget(scope, ['memory-1', 'memory-2', 'memory-3', 'memory-4'])
      ).resolves.toEqual([
        { id: 'memory-1', outcome: 'forgotten' },
        { id: 'memory-2', outcome: 'already_forgotten' },
        { id: 'memory-3', outcome: 'not_found' },
        { id: 'memory-4', outcome: 'failed', error: 'rejected execution: write queue full' },
      ]);
    });

    it('throws when the read fails', async () => {
      esClient.search.mockRejectedValue(new Error('connection refused'));

      await expect(service.forget(scope, ['memory-1'])).rejects.toThrow('connection refused');
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('throws before reading when given more ids than one call takes', async () => {
      const ids = Array.from(
        { length: MAX_SESSION_MEMORY_FORGET_IDS + 1 },
        (_, index) => `memory-${index}`
      );

      await expect(service.forget(scope, ids)).rejects.toThrow(
        `Cannot forget more than ${MAX_SESSION_MEMORY_FORGET_IDS} memories at once`
      );
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('counts a repeated id once against the limit and reads one revision per id', async () => {
      esClient.search.mockResolvedValue(searchResponse([]));
      const ids = Array.from(
        { length: MAX_SESSION_MEMORY_FORGET_IDS },
        (_, index) => `memory-${index}`
      );

      const result = await service.forget(scope, [...ids, 'memory-0']);

      expect(result).toHaveLength(MAX_SESSION_MEMORY_FORGET_IDS);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ size: MAX_SESSION_MEMORY_FORGET_IDS })
      );
    });

    it('does nothing for an empty list', async () => {
      await expect(service.forget(scope, [])).resolves.toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });
});
