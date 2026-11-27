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

  describe('scope validation', () => {
    it.each([
      ['empty space', { space: '', userId: 'jdoe' }, /space/],
      ['blank space', { space: '   ', userId: 'jdoe' }, /space/],
      ['empty userId', { space: 'default', userId: '' }, /userId/],
      ['blank userId', { space: 'default', userId: '   ' }, /userId/],
    ])(
      'rejects %s on remember, get, and forget before calling Elasticsearch',
      async (_, invalidScope, pattern) => {
        await expect(
          service.remember(invalidScope, { sessionId: 'session-1', content: 'note' })
        ).rejects.toThrow(pattern);
        await expect(service.get(invalidScope, 'memory-1')).rejects.toThrow(pattern);
        await expect(service.forget(invalidScope, ['memory-1'])).rejects.toThrow(pattern);
        await expect(service.forget(invalidScope, [])).rejects.toThrow(pattern);

        expect(esClient.index).not.toHaveBeenCalled();
        expect(esClient.search).not.toHaveBeenCalled();
        expect(esClient.bulk).not.toHaveBeenCalled();
      }
    );
  });

  describe('readRevised', () => {
    const revision = (
      id: string,
      timestamp: string,
      overrides: Partial<StoredSessionMemory> = {}
    ): StoredSessionMemory =>
      ({
        ...storedMemory,
        id,
        '@timestamp': timestamp,
        ...overrides,
      } as StoredSessionMemory);
    const input = {
      space: 'default',
      aiIndexId: 'ops-memory',
      since: '2026-11-09T00:00:00.000Z',
      size: 10,
    };

    it("finds the AI index's revisions across users, oldest first, collapsed to one per memory", async () => {
      esClient.search
        .mockResolvedValueOnce(searchResponse([revision('memory-1', '2026-11-09T01:00:00.000Z')]))
        .mockResolvedValueOnce(searchResponse([revision('memory-1', '2026-11-09T02:00:00.000Z')]));

      const { memories, next } = await service.readRevised(input);

      expect(esClient.search.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          index: SESSION_MEMORY_DATA_STREAM,
          sort: [{ '@timestamp': 'asc' }, { id: 'asc' }],
          collapse: { field: 'id' },
          size: 10,
          query: {
            bool: {
              filter: [
                { term: { space: 'default' } },
                { term: { ai_index_id: 'ops-memory' } },
                {
                  bool: {
                    should: [{ range: { '@timestamp': { gt: input.since } } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        })
      );
      expect(memories).toEqual([
        expect.objectContaining({ id: 'memory-1', revisedAt: '2026-11-09T02:00:00.000Z' }),
      ]);
      expect(next).toBeUndefined();
    });

    it('continues after the last memory read at the same time', async () => {
      esClient.search.mockResolvedValueOnce(searchResponse([]));

      await service.readRevised({ ...input, after: 'memory-7' });

      const query = esClient.search.mock.calls[0][0]?.query;
      expect(JSON.stringify(query)).toContain(
        JSON.stringify({
          bool: {
            filter: [
              { term: { '@timestamp': input.since } },
              { range: { id: { gt: 'memory-7' } } },
            ],
          },
        })
      );
    });

    it('leaves out a memory whose latest revision is forgotten or no longer lists the AI index', async () => {
      esClient.search
        .mockResolvedValueOnce(
          searchResponse([
            revision('memory-1', '2026-11-09T01:00:00.000Z'),
            revision('memory-2', '2026-11-09T01:01:00.000Z'),
            revision('memory-3', '2026-11-09T01:02:00.000Z'),
          ])
        )
        .mockResolvedValueOnce(
          searchResponse([
            revision('memory-1', '2026-11-09T03:00:00.000Z'),
            { ...forgottenMemory, id: 'memory-2' },
            revision('memory-3', '2026-11-09T03:00:00.000Z', { ai_index_id: ['other'] }),
          ])
        );

      const { memories } = await service.readRevised(input);

      expect(memories.map(({ id }) => id)).toEqual(['memory-1']);
    });

    it('says where it stopped when it looked at as many revisions as it may', async () => {
      esClient.search
        .mockResolvedValueOnce(
          searchResponse([
            revision('memory-1', '2026-11-09T01:00:00.000Z'),
            revision('memory-2', '2026-11-09T01:00:00.000Z'),
          ])
        )
        .mockResolvedValueOnce(searchResponse([]));

      const { memories, next } = await service.readRevised({ ...input, size: 2 });

      expect(memories).toEqual([]);
      expect(next).toEqual({ revisedAt: '2026-11-09T01:00:00.000Z', id: 'memory-2' });
    });

    it('reads nothing more when nothing was revised', async () => {
      esClient.search.mockResolvedValueOnce(searchResponse([]));

      await expect(service.readRevised(input)).resolves.toEqual({ memories: [] });
      expect(esClient.search).toHaveBeenCalledTimes(1);
    });

    it('requires a space', async () => {
      await expect(service.readRevised({ ...input, space: ' ' })).rejects.toThrow('space');
    });
  });
});
