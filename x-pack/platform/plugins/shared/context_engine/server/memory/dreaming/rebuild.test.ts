/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { LONG_TERM_MEMORY_INDEX } from '../../../common/memory';
import { DELETE_PAGE_SIZE, deleteLongTermMemories } from './rebuild';

type SearchResponse = Awaited<
  ReturnType<ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>['search']>
>;
type BulkResponse = Awaited<
  ReturnType<ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>['bulk']>
>;

const page = (ids: string[]) =>
  ({
    hits: { hits: ids.map((id) => ({ _index: LONG_TERM_MEMORY_INDEX, _id: id })) },
  } as unknown as SearchResponse);

const bulkResult = (items: Array<{ id: string; status: number; error?: boolean }>) =>
  ({
    errors: items.some(({ error }) => error),
    took: 1,
    items: items.map(({ id, status, error }) => ({
      delete: {
        _index: LONG_TERM_MEMORY_INDEX,
        _id: id,
        status,
        ...(error
          ? { error: { type: 'security_exception', reason: 'unauthorized' } }
          : { result: status === 404 ? 'not_found' : 'deleted' }),
      },
    })),
  } as unknown as BulkResponse);

describe('deleteLongTermMemories', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
  });

  it('deletes the space memories without refreshing the store itself', async () => {
    esClient.search.mockResolvedValueOnce(page(['a', 'b']));
    esClient.bulk.mockResolvedValueOnce(
      bulkResult([
        { id: 'a', status: 200 },
        { id: 'b', status: 404 },
      ])
    );

    await expect(deleteLongTermMemories({ esClient, spaceId: 'team-a' })).resolves.toBe(1);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: LONG_TERM_MEMORY_INDEX, size: DELETE_PAGE_SIZE })
    );
    expect(esClient.bulk).toHaveBeenCalledWith(
      {
        refresh: 'wait_for',
        operations: [
          { delete: { _index: LONG_TERM_MEMORY_INDEX, _id: 'a' } },
          { delete: { _index: LONG_TERM_MEMORY_INDEX, _id: 'b' } },
        ],
      },
      { signal: undefined }
    );
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('keeps deleting while pages come back full', async () => {
    const full = Array.from({ length: DELETE_PAGE_SIZE }, (_, index) => `m${index}`);
    esClient.search.mockResolvedValueOnce(page(full)).mockResolvedValueOnce(page([]));
    esClient.bulk.mockResolvedValueOnce(bulkResult(full.map((id) => ({ id, status: 200 }))));

    await expect(deleteLongTermMemories({ esClient, spaceId: 'team-a' })).resolves.toBe(
      DELETE_PAGE_SIZE
    );
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the space has no long-term memories', async () => {
    esClient.search.mockResolvedValueOnce(page([]));

    await expect(deleteLongTermMemories({ esClient, spaceId: 'team-a' })).resolves.toBe(0);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('fails when a delete fails', async () => {
    esClient.search.mockResolvedValueOnce(page(['a']));
    esClient.bulk.mockResolvedValueOnce(bulkResult([{ id: 'a', status: 403, error: true }]));

    await expect(deleteLongTermMemories({ esClient, spaceId: 'team-a' })).rejects.toThrow(
      "Failed to delete long-term memory 'a': unauthorized"
    );
  });
});
