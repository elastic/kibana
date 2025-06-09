/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchWatchesWithPagination } from './fetch_watches_with_pagination';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { WatcherQueryWatch } from '@elastic/elasticsearch/lib/api/types';
import { QUERY_WATCHES_PAGINATION } from '../../../common/constants';

describe('fetchWatchesWithPagination (iterative version with pageSize)', () => {
  const mockQueryWatches = jest.fn();
  const mockScopedClusterClient: IScopedClusterClient = {
    asCurrentUser: {
      watcher: {
        queryWatches: mockQueryWatches,
      },
    },
    asInternalUser: {} as any,
  } as IScopedClusterClient;

  const sampleWatches = [{ _id: 1 }, { _id: 2 }, { _id: 3 }] as WatcherQueryWatch[];
  const pageSize = 3;

  beforeEach(() => {
    mockQueryWatches.mockClear();
  });

  describe('when there are no watches', () => {
    it('should return an empty array if queryWatches returns nothing', async () => {
      mockQueryWatches.mockResolvedValueOnce({ count: 0, watches: [] });

      const watches = await fetchWatchesWithPagination(mockScopedClusterClient, pageSize);
      expect(watches).toEqual([]);
      expect(mockQueryWatches).toHaveBeenCalledTimes(1);
      expect(mockQueryWatches).toHaveBeenCalledWith({
        from: 0,
        size: pageSize,
      });
    });
  });

  describe('when there are fewer watches than a full page', () => {
    it('should return all the watches from the first page', async () => {
      mockQueryWatches.mockResolvedValueOnce({
        count: 3,
        watches: sampleWatches,
      });

      const watches = await fetchWatchesWithPagination(mockScopedClusterClient, pageSize);
      expect(watches).toEqual(sampleWatches);
      expect(mockQueryWatches).toHaveBeenCalledTimes(1);
    });
  });

  describe('when watches span multiple pages', () => {
    it('should accumulate all watches across multiple pages', async () => {
      const additionalWatches = [{ _id: 4 }, { _id: 5 }, { _id: 6 }] as WatcherQueryWatch[];
      const totalCount = sampleWatches.length + additionalWatches.length;

      mockQueryWatches
        .mockResolvedValueOnce({ count: totalCount, watches: sampleWatches }) // from: 0
        .mockResolvedValueOnce({ count: totalCount, watches: additionalWatches }); // from: 3

      const watches = await fetchWatchesWithPagination(mockScopedClusterClient, pageSize);
      expect(watches).toEqual([...sampleWatches, ...additionalWatches]);
      expect(mockQueryWatches).toHaveBeenCalledTimes(2);
      expect(mockQueryWatches).toHaveBeenNthCalledWith(1, {
        from: 0,
        size: pageSize,
      });
      expect(mockQueryWatches).toHaveBeenNthCalledWith(2, {
        from: pageSize,
        size: pageSize,
      });
    });
  });

  it('should not exceed the Elasticsearch max result window (from + size <= 10000)', async () => {
    const mockQueryWatches = jest.fn();
    const mockScopedClusterClient: IScopedClusterClient = {
      asCurrentUser: {
        watcher: {
          queryWatches: mockQueryWatches,
        },
      },
      asInternalUser: {} as any,
    } as IScopedClusterClient;

    const pageSize = 1000;
    const totalWatches = 11000; // simulate more than allowed

    // Mock 10 pages of 1000 watches
    for (let i = 0; i < 10; i++) {
      mockQueryWatches.mockResolvedValueOnce({
        count: totalWatches,
        watches: Array.from({ length: pageSize }, (_, index) => ({ _id: i * pageSize + index })),
      });
    }

    // 11th call should not be made, so no result for it
    mockQueryWatches.mockResolvedValue({
      count: totalWatches,
      watches: [], // if it gets called by mistake
    });

    const result = await fetchWatchesWithPagination(mockScopedClusterClient, pageSize);

    expect(result).toHaveLength(10000); // max allowed
    expect(mockQueryWatches).toHaveBeenCalledTimes(10);
    mockQueryWatches.mock.calls.forEach(([params]) => {
      expect(params.from + params.size).toBeLessThanOrEqual(
        QUERY_WATCHES_PAGINATION.MAX_RESULT_WINDOW
      );
    });
  });
});
