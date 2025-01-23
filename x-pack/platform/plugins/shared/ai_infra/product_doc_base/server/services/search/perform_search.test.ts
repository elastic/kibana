/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { performSearch } from './perform_search';

describe('performSearch', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    esClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
  });

  it('calls esClient.search with the correct parameters', async () => {
    await performSearch({
      searchQuery: 'query',
      highlights: 3,
      size: 3,
      index: ['index1', 'index2'],
      client: esClient,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      size: 3,
      query: expect.any(Object),
      highlight: {
        fields: {
          content_body: expect.any(Object),
        },
      },
    });
  });

  it('calls esClient.search without highlight when highlights=0', async () => {
    await performSearch({
      searchQuery: 'query',
      highlights: 0,
      size: 3,
      index: ['index1', 'index2'],
      client: esClient,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.not.objectContaining({
        highlight: expect.any(Object),
      })
    );
  });
});
