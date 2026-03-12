/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestMock } from '../test/helpers';
import { routeDependencies, RouterMock } from '../test/helpers';
import { addBasePath } from '../routes/api';
import { registerIndicesRoutes } from '../routes/api/indices';
import {
  createTestIndexResponse,
  createTestIndexState,
  createTestIndexStats,
} from '../test/helpers/indices_fixtures';

describe('[Index management API Routes] fetch indices lib function', () => {
  const router = new RouterMock();

  const getIndices = router.getMockESApiFn('indices.get');
  const getIndicesStats = router.getMockESApiFn('indices.stats');
  const getMeteringStats = router.getMockESApiFnAsSecondaryAuthUser('transport.request');
  const getEsqlQuery = router.getMockESApiFn('esql.query');
  const mockRequest: RequestMock = {
    method: 'get',
    path: addBasePath('/indices'),
  };

  describe('stateful', () => {
    beforeAll(() => {
      registerIndicesRoutes({
        ...routeDependencies,
        config: {
          ...routeDependencies.config,
          isSizeAndDocCountEnabled: false,
          isIndexStatsEnabled: true,
        },
        router,
      });
    });

    test('regular index', async () => {
      getIndices.mockResolvedValue({
        regular_index: createTestIndexState(),
      });
      getIndicesStats.mockResolvedValue({
        indices: {
          regular_index: createTestIndexStats({ uuid: 'regular_index' }),
        },
      });
      getEsqlQuery.mockResolvedValue({
        columns: [
          { name: 'count()', type: 'long' },
          { name: '_index', type: 'keyword' },
        ],
        values: [[1, 'regular_index']],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [createTestIndexResponse({ name: 'regular_index', uuid: 'regular_index' })],
      });
    });
    test('index with aliases', async () => {
      getIndices.mockResolvedValue({
        index_with_aliases: createTestIndexState({
          aliases: { test_alias: {}, another_alias: {} },
        }),
      });
      getIndicesStats.mockResolvedValue({
        indices: {
          index_with_aliases: createTestIndexStats({ uuid: 'index_with_aliases' }),
        },
      });
      getEsqlQuery.mockResolvedValue({
        columns: [
          { name: 'count()', type: 'long' },
          { name: '_index', type: 'keyword' },
        ],
        values: [[1, 'index_with_aliases']],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            aliases: ['test_alias', 'another_alias'],
            name: 'index_with_aliases',
            uuid: 'index_with_aliases',
          }),
        ],
      });
    });
    test('frozen index', async () => {
      getIndices.mockResolvedValue({
        frozen_index: createTestIndexState({
          settings: { index: { number_of_shards: 1, number_of_replicas: 1, frozen: 'true' } },
        }),
      });
      getIndicesStats.mockResolvedValue({
        indices: {
          frozen_index: createTestIndexStats({ uuid: 'frozen_index' }),
        },
      });
      getEsqlQuery.mockResolvedValue({
        columns: [
          { name: 'count()', type: 'long' },
          { name: '_index', type: 'keyword' },
        ],
        values: [[1, 'frozen_index']],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'frozen_index',
            uuid: 'frozen_index',
            isFrozen: true,
          }),
        ],
      });
    });
    test('hidden index', async () => {
      getIndices.mockResolvedValue({
        hidden_index: createTestIndexState({
          settings: { index: { number_of_shards: 1, number_of_replicas: 1, hidden: 'true' } },
        }),
      });
      getIndicesStats.mockResolvedValue({
        indices: {
          hidden_index: createTestIndexStats({ uuid: 'hidden_index' }),
        },
      });
      getEsqlQuery.mockResolvedValue({
        columns: [
          { name: 'count()', type: 'long' },
          { name: '_index', type: 'keyword' },
        ],
        values: [[1, 'hidden_index']],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'hidden_index',
            uuid: 'hidden_index',
            hidden: true,
          }),
        ],
      });
    });
    test('data stream index', async () => {
      getIndices.mockResolvedValue({
        data_stream_index: createTestIndexState({
          data_stream: 'test_data_stream',
        }),
      });
      getIndicesStats.mockResolvedValue({
        indices: {
          data_stream_index: createTestIndexStats({ uuid: 'data_stream_index' }),
        },
      });
      getEsqlQuery.mockResolvedValue({
        columns: [
          { name: 'count()', type: 'long' },
          { name: '_index', type: 'keyword' },
        ],
        values: [[1, 'data_stream_index']],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'data_stream_index',
            uuid: 'data_stream_index',
            data_stream: 'test_data_stream',
          }),
        ],
      });
    });
    test('index missing in stats call', async () => {
      getIndices.mockResolvedValue({
        index_missing_stats: createTestIndexState(),
      });
      // simulates when an index has been deleted after get indices call
      // deleted index won't be present in the indices stats call response
      getIndicesStats.mockResolvedValue({
        indices: {
          some_other_index: createTestIndexStats({ uuid: 'some_other_index' }),
        },
      });
      getEsqlQuery.mockResolvedValue({
        columns: [
          { name: 'count()', type: 'long' },
          { name: '_index', type: 'keyword' },
        ],
        values: [],
      });
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'index_missing_stats',
            uuid: undefined,
            health: undefined,
            status: undefined,
            documents: 0,
            size: 0,
            primary_size: 0,
          }),
        ],
      });
    });
  });

  describe('stateless', () => {
    beforeAll(() => {
      registerIndicesRoutes({
        ...routeDependencies,
        config: {
          ...routeDependencies.config,
          isSizeAndDocCountEnabled: true,
          isIndexStatsEnabled: false,
        },
        router,
      });
    });

    test('regular index', async () => {
      getIndices.mockResolvedValue({
        regular_index: createTestIndexState(),
      });
      getMeteringStats.mockResolvedValue({
        indices: [{ name: 'regular_index', num_docs: 100, size_in_bytes: 1000 }],
      });
      getEsqlQuery.mockResolvedValue({
        columns: [
          { name: 'count()', type: 'long' },
          { name: '_index', type: 'keyword' },
        ],
        values: [[42, 'regular_index']],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          {
            name: 'regular_index',
            isFrozen: false,
            aliases: 'none',
            hidden: false,
            data_stream: undefined,
            documents: 42,
            size: 1000,
          },
        ],
      });
    });
  });
});
