/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
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
      ).resolves.toEqual({
        'memory-1': 'forgotten',
        'memory-2': 'already_forgotten',
        'memory-3': 'not_found',
      });
      expect(esClient.bulk).toHaveBeenCalledWith({
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

    it('throws when Elasticsearch rejects a tombstone', async () => {
      esClient.search.mockResolvedValue(searchResponse([storedMemory]));
      esClient.bulk.mockResolvedValue(
        bulkResponse([
          {
            create: {
              _index: '.ds-memory',
              status: 400,
              error: { type: 'document_parsing_exception', reason: 'failed to parse' },
            },
          },
        ])
      );

      await expect(service.forget(scope, ['memory-1'])).rejects.toThrow(
        'Failed to write to session memory: failed to parse'
      );
    });

    it('does nothing for an empty list', async () => {
      await expect(service.forget(scope, [])).resolves.toEqual({});
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  describe('hardDelete', () => {
    it('throws when Elasticsearch fails to delete some documents', async () => {
      esClient.deleteByQuery.mockResolvedValue({
        deleted: 1,
        failures: [
          {
            id: 'doc-1',
            index: '.ds-memory',
            status: 500,
            cause: { type: 'exception', reason: 'shard unavailable' },
          },
        ],
      });

      await expect(service.hardDelete(scope, ['memory-1'])).rejects.toThrow(
        'Failed to delete from session memory: shard unavailable'
      );
    });

    it('does nothing for an empty list', async () => {
      await expect(service.hardDelete(scope, [])).resolves.toEqual({ deletedDocuments: 0 });
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });
});
