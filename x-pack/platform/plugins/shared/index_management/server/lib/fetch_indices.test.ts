/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestMock } from '../test/helpers';
import { mockLogger, routeDependencies, RouterMock } from '../test/helpers';
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
  const getCount = router.getMockESApiFn('count');
  const getMeteringStats = router.getMockESApiFnAsSecondaryAuthUser('transport.request');
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
      getCount.mockResolvedValue({ count: 1 });
      getIndicesStats.mockResolvedValue({
        indices: {
          regular_index: createTestIndexStats({ uuid: 'regular_index' }),
        },
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
      getCount.mockResolvedValue({ count: 1 });
      getIndicesStats.mockResolvedValue({
        indices: {
          index_with_aliases: createTestIndexStats({ uuid: 'index_with_aliases' }),
        },
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
      getCount.mockResolvedValue({ count: 1 });
      getIndicesStats.mockResolvedValue({
        indices: {
          frozen_index: createTestIndexStats({ uuid: 'frozen_index' }),
        },
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
      getCount.mockResolvedValue({ count: 1 });
      getIndicesStats.mockResolvedValue({
        indices: {
          hidden_index: createTestIndexStats({ uuid: 'hidden_index' }),
        },
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
      getCount.mockResolvedValue({ count: 1 });
      getIndicesStats.mockResolvedValue({
        indices: {
          data_stream_index: createTestIndexStats({ uuid: 'data_stream_index' }),
        },
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
      getCount.mockResolvedValue({ count: 0 });
      // simulates when an index has been deleted after get indices call
      // deleted index won't be present in the indices stats call response
      getIndicesStats.mockResolvedValue({
        indices: {
          some_other_index: createTestIndexStats({ uuid: 'some_other_index' }),
        },
      });
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'index_missing_stats',
            uuid: undefined,
            health: undefined,
            status: undefined,
            documents: 0,
            size: '0b',
            primary_size: '0b',
          }),
        ],
      });
    });

    test('_count API returns different value than _stats (more accurate count)', async () => {
      // This test verifies the _count API is used for accurate document counts
      // The _stats API may report inflated counts due to nested documents
      getIndices.mockResolvedValue({
        test_index: createTestIndexState(),
      });
      // _count API returns 50 (accurate count excluding nested documents)
      getCount.mockResolvedValue({ count: 50 });
      // _stats API shows 100 docs with 50 deleted (includes nested documents)
      getIndicesStats.mockResolvedValue({
        indices: {
          test_index: {
            ...createTestIndexStats({ uuid: 'test_index' }),
            primaries: { docs: { count: 100, deleted: 50 }, store: { size_in_bytes: 100 } },
          },
        },
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'test_index',
            uuid: 'test_index',
            // Should use _count API result (50), not _stats (100)
            documents: 50,
            documents_deleted: 50,
          }),
        ],
      });
    });

    test('_count API error falls back to 0 and logs warning', async () => {
      // When _count API fails, fall back to 0 and log the error
      mockLogger.warn.mockClear();

      getIndices.mockResolvedValue({
        closed_index: createTestIndexState(),
      });
      // _count API throws error
      getCount.mockRejectedValue(new Error('index_closed_exception'));
      // _stats API has doc count
      getIndicesStats.mockResolvedValue({
        indices: {
          closed_index: {
            ...createTestIndexStats({ uuid: 'closed_index', status: 'close' }),
            primaries: { docs: { count: 75, deleted: 0 }, store: { size_in_bytes: 100 } },
          },
        },
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'closed_index',
            uuid: 'closed_index',
            status: 'close',
            // Falls back to 0 when _count API fails
            documents: 0,
            documents_deleted: 0,
          }),
        ],
      });

      // Verify logger.warn was called with the error message
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '_count API failed for index "closed_index": index_closed_exception'
      );
    });

    test('_count API error with missing stats falls back to 0 and logs warning', async () => {
      // When both _count API fails and stats are missing, document count should be 0
      mockLogger.warn.mockClear();

      getIndices.mockResolvedValue({
        problematic_index: createTestIndexState(),
      });
      getCount.mockRejectedValue(new Error('some_error'));
      getIndicesStats.mockResolvedValue({
        indices: {
          // Stats for this index are missing
          other_index: createTestIndexStats({ uuid: 'other_index' }),
        },
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          createTestIndexResponse({
            name: 'problematic_index',
            uuid: undefined,
            health: undefined,
            status: undefined,
            documents: 0,
            size: '0b',
            primary_size: '0b',
          }),
        ],
      });

      // Verify logger.warn was called with the error message
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '_count API failed for index "problematic_index": some_error'
      );
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
      getCount.mockResolvedValue({ count: 100 });
      getMeteringStats.mockResolvedValue({
        indices: [{ name: 'regular_index', num_docs: 100, size_in_bytes: 1000 }],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          {
            name: 'regular_index',
            isFrozen: false,
            aliases: 'none',
            hidden: false,
            data_stream: undefined,
            documents: 100,
            size: '1000b',
          },
        ],
      });
    });

    test('_count API returns different value than _metering/stats (more accurate count)', async () => {
      // The _count API provides accurate counts, metering stats may differ
      getIndices.mockResolvedValue({
        test_index: createTestIndexState(),
      });
      // _count API returns 80 (accurate count)
      getCount.mockResolvedValue({ count: 80 });
      // _metering/stats shows 120 docs (may include nested documents)
      getMeteringStats.mockResolvedValue({
        indices: [{ name: 'test_index', num_docs: 120, size_in_bytes: 1000 }],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          {
            name: 'test_index',
            isFrozen: false,
            aliases: 'none',
            hidden: false,
            data_stream: undefined,
            mode: undefined,
            // Should use _count API result (80), not metering stats (120)
            documents: 80,
            size: '1000b',
          },
        ],
      });
    });

    test('_count API error falls back to 0 and logs warning', async () => {
      // When _count API fails, fall back to 0 and log the error
      mockLogger.warn.mockClear();

      getIndices.mockResolvedValue({
        problematic_index: createTestIndexState(),
      });
      // _count API throws error
      getCount.mockRejectedValue(new Error('some_error'));
      // _metering/stats has doc count
      getMeteringStats.mockResolvedValue({
        indices: [{ name: 'problematic_index', num_docs: 200, size_in_bytes: 1000 }],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          {
            name: 'problematic_index',
            isFrozen: false,
            aliases: 'none',
            hidden: false,
            data_stream: undefined,
            mode: undefined,
            // Falls back to 0 when _count API fails
            documents: 0,
            size: '1000b',
          },
        ],
      });

      // Verify logger.warn was called with the error message
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '_count API failed for index "problematic_index": some_error'
      );
    });

    test('_count API error with missing metering stats falls back to 0 and logs warning', async () => {
      // When both _count API fails and metering stats are missing, document count should be 0
      mockLogger.warn.mockClear();

      getIndices.mockResolvedValue({
        missing_stats_index: createTestIndexState(),
      });
      getCount.mockRejectedValue(new Error('some_error'));
      getMeteringStats.mockResolvedValue({
        indices: [
          // Stats for missing_stats_index are not present
          { name: 'other_index', num_docs: 50, size_in_bytes: 500 },
        ],
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: [
          {
            name: 'missing_stats_index',
            isFrozen: false,
            aliases: 'none',
            hidden: false,
            data_stream: undefined,
            mode: undefined,
            // No stats found, falls back to 0
            documents: 0,
            size: '0b',
          },
        ],
      });

      // Verify logger.warn was called with the error message
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '_count API failed for index "missing_stats_index": some_error'
      );
    });
  });
});
