/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchWatchesWithPagination } from './fetch_watches_with_pagination';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { WatcherQueryWatch } from '@elastic/elasticsearch/lib/api/types';

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
});
