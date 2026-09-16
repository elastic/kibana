/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { createEsSearchIterable } from './create_es_search_iterable';

const makeHit = (id: string) => ({
  _id: id,
  _source: {},
  sort: [id],
});

const makeSearchResponse = (ids: string[], pitId = 'pit-1') => ({
  pit_id: pitId,
  hits: { hits: ids.map(makeHit) },
});

describe('createEsSearchIterable', () => {
  let esClient: jest.Mocked<
    Pick<ElasticsearchClient, 'search' | 'openPointInTime' | 'closePointInTime'>
  >;

  beforeEach(() => {
    esClient = {
      search: jest.fn(),
      openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-1' }),
      closePointInTime: jest.fn().mockResolvedValue({}),
    };
  });

  it('calls closePointInTime when consumer breaks out of the loop', async () => {
    esClient.search
      .mockResolvedValueOnce(makeSearchResponse(['a', 'b', 'c']) as any)
      .mockResolvedValueOnce(makeSearchResponse(['d', 'e', 'f']) as any);

    const iterable = createEsSearchIterable({
      esClient: esClient as unknown as ElasticsearchClient,
      searchRequest: { index: 'test', sort: [{ _doc: { order: 'asc' } }] },
    });

    for await (const _ of iterable) {
      break;
    }

    expect(esClient.closePointInTime).toHaveBeenCalledTimes(1);
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
  });

  it('does not mask the consumer error when closePointInTime rejects on break', async () => {
    esClient.search.mockResolvedValueOnce(makeSearchResponse(['a']) as any);
    esClient.closePointInTime.mockRejectedValue(new Error('close failed'));

    const iterable = createEsSearchIterable({
      esClient: esClient as unknown as ElasticsearchClient,
      searchRequest: { index: 'test', sort: [{ _doc: { order: 'asc' } }] },
    });

    const thrownError = new Error('consumer error');
    await expect(async () => {
      for await (const _ of iterable) {
        throw thrownError;
      }
    }).rejects.toThrow('consumer error');
  });
});
