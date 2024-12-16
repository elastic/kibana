/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import {
  fetchRollupIndexPatterns,
  fetchRollupSavedSearches,
  fetchRollupVisualizations,
} from './helpers';

const defaultMockRollupIndexSavedObject = [
  { _id: 'index-pattern:04509400-a8c7-11eb-ae5f-81cf9ff32666' },
];

const defaultMockRollupSavedSearchSavedObjects = [
  {
    _id: 'search:3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
    _source: {
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
      ],
    },
    sort: [1619682950879],
  },
  {
    _id: 'search:571aaf70-4c88-11e8-b3d7-01146121b73d',
    _source: {
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: '04509400-a8c7-11eb-ae5f-81cf9ff32666',
        },
      ],
    },
    sort: [1619682956106],
  },
];

const defaultMockRollupVisualizationsSavedObjects = [
  {
    _id: 'visualization:rocks-1',
    _source: {
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
      ],
      type: 'visualization',
    },
    sort: [1619682950879],
  },
  {
    _id: 'visualization:rocks-2',
    _source: {
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: '04509400-a8c7-11eb-ae5f-81cf9ff32666',
        },
      ],
      type: 'visualization',
    },
    sort: [1619682956106],
  },
  {
    _id: 'lens:rocks-3',
    _source: {
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: '04509400-a8c7-11eb-ae5f-81cf9ff32666',
        },
      ],
      type: 'lens',
    },
    sort: [1619682956106],
  },
  {
    _id: 'lens:rocks-4',
    _source: {
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'search',
          id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
        },
      ],
      type: 'lens',
    },
    sort: [1619682956106],
  },
];

describe('rollupUsageCollectorHelpers', () => {
  const mockIndex = 'mock_index';
  const getMockCallCluster = (hits: unknown[]) =>
    ({
      search: () => Promise.resolve({ hits: { hits } }) as unknown,
    } as ElasticsearchClient);

  describe('fetchRollupIndexPatterns', () => {
    it('Returns empty array when no results found', async () => {
      const result = await fetchRollupIndexPatterns(
        mockIndex,
        getMockCallCluster(undefined as any)
      );
      expect(result).toStrictEqual([]);
    });

    it('Returns the index pattern id', async () => {
      const result = await fetchRollupIndexPatterns(
        mockIndex,
        getMockCallCluster(defaultMockRollupIndexSavedObject)
      );

      expect(result).toStrictEqual(['04509400-a8c7-11eb-ae5f-81cf9ff32666']);
    });
  });

  describe('fetchRollupSavedSearches', () => {
    it('Returns empty array when no results found', async () => {
      const result = await fetchRollupSavedSearches(
        mockIndex,
        getMockCallCluster(undefined as any),
        { '04509400-a8c7-11eb-ae5f-81cf9ff32666': true }
      );
      expect(result).toStrictEqual([]);
    });

    it('Returns the saved search if exists', async () => {
      const result = await fetchRollupSavedSearches(
        mockIndex,
        getMockCallCluster(defaultMockRollupSavedSearchSavedObjects),
        { '04509400-a8c7-11eb-ae5f-81cf9ff32666': true }
      );

      expect(result).toStrictEqual(['571aaf70-4c88-11e8-b3d7-01146121b73d']);
    });
  });

  describe('fetchRollupVisualizations', () => {
    it('Returns zero metrics when no results found', async () => {
      const result = await fetchRollupVisualizations(
        mockIndex,
        getMockCallCluster(undefined as any),
        { '04509400-a8c7-11eb-ae5f-81cf9ff32666': true },
        { '571aaf70-4c88-11e8-b3d7-01146121b73d': true }
      );
      expect(result).toStrictEqual({
        rollupVisualizations: 0,
        rollupVisualizationsFromSavedSearches: 0,
        rollupLensVisualizations: 0,
        rollupLensVisualizationsFromSavedSearches: 0,
      });
    });

    it('Returns the correct counters', async () => {
      const result = await fetchRollupVisualizations(
        mockIndex,
        getMockCallCluster(defaultMockRollupVisualizationsSavedObjects),
        { '04509400-a8c7-11eb-ae5f-81cf9ff32666': true },
        { '571aaf70-4c88-11e8-b3d7-01146121b73d': true }
      );

      expect(result).toStrictEqual({
        rollupVisualizations: 2,
        rollupVisualizationsFromSavedSearches: 1,
        rollupLensVisualizations: 1,
        rollupLensVisualizationsFromSavedSearches: 1,
      });
    });
  });
});
