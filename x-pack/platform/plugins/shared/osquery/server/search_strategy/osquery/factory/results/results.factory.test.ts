/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTotalHitsRelation } from '@elastic/elasticsearch/lib/api/types';
import { allResults } from './index';
import { Direction } from '../../../../../common/search_strategy';

// Mock the buildResultsQuery function
jest.mock('./query.all_results.dsl', () => ({
  buildResultsQuery: jest.fn(() => ({})),
}));

// Mock the inspectStringifyObject utility
jest.mock('../../../../../common/utils/build_query', () => ({
  inspectStringifyObject: jest.fn((obj: unknown) => JSON.stringify(obj)),
}));

describe('allResults factory', () => {
  const baseOptions = {
    actionId: 'action-123',
    pagination: {
      activePage: 0,
      querySize: 100,
      cursorStart: 0,
    },
    sort: [
      {
        field: '@timestamp',
        direction: Direction.desc,
      },
    ],
    kuery: '',
  };

  describe('parse', () => {
    it('should extract searchAfter from last hit sort values', async () => {
      const mockResponse = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 10,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits: [
              { _id: '1', _index: 'test', sort: [1733900000000, 1] },
              { _id: '2', _index: 'test', sort: [1733900001000, 2] },
              { _id: '3', _index: 'test', sort: [1733900002000, 3] },
            ],
            total: { value: 100, relation: 'eq' as SearchTotalHitsRelation },
          },
        },
      };

      const result = await allResults.parse(baseOptions, mockResponse);

      expect(result.searchAfter).toEqual([1733900002000, 3]);
    });

    it('should include refreshed pitId from response if available', async () => {
      const mockResponse = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 10,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { hits: [], total: { value: 0, relation: 'eq' as SearchTotalHitsRelation } },
          pit_id: 'refreshed-pit-id',
        },
      };

      const optionsWithPit = {
        ...baseOptions,
        pitId: 'original-pit-id',
      };

      const result = await allResults.parse(optionsWithPit, mockResponse);

      expect(result.pitId).toBe('refreshed-pit-id');
    });

    it('should preserve original pitId when response does not include refreshed pit_id', async () => {
      const mockResponse = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 10,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { hits: [], total: { value: 0, relation: 'eq' as SearchTotalHitsRelation } },
        },
      };

      const optionsWithPit = {
        ...baseOptions,
        pitId: 'original-pit-id',
      };

      const result = await allResults.parse(optionsWithPit, mockResponse);

      expect(result.pitId).toBe('original-pit-id');
    });

    it('should set hasMore to true when hits equal querySize', async () => {
      const hits = Array(100)
        .fill(null)
        .map((_, i) => ({
          _id: `${i}`,
          _index: 'test',
          sort: [i],
        }));

      const mockResponse = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 10,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits,
            total: { value: 500, relation: 'eq' as SearchTotalHitsRelation },
          },
        },
      };

      const result = await allResults.parse(
        { ...baseOptions, pagination: { activePage: 0, querySize: 100, cursorStart: 0 } },
        mockResponse
      );

      expect(result.hasMore).toBe(true);
    });

    it('should set hasMore to false when hits less than querySize', async () => {
      const hits = Array(50)
        .fill(null)
        .map((_, i) => ({
          _id: `${i}`,
          _index: 'test',
          sort: [i],
        }));

      const mockResponse = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 10,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits,
            total: { value: 50, relation: 'eq' as SearchTotalHitsRelation },
          },
        },
      };

      const result = await allResults.parse(
        { ...baseOptions, pagination: { activePage: 0, querySize: 100, cursorStart: 0 } },
        mockResponse
      );

      expect(result.hasMore).toBe(false);
    });

    it('should handle empty results gracefully', async () => {
      const mockResponse = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 10,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { hits: [], total: { value: 0, relation: 'eq' as SearchTotalHitsRelation } },
        },
      };

      const result = await allResults.parse(baseOptions, mockResponse);

      expect(result.searchAfter).toBeUndefined();
      expect(result.hasMore).toBe(false);
      expect(result.edges).toEqual([]);
    });

    it('should include edges from response hits', async () => {
      const mockHits = [
        { _id: '1', _index: 'test', fields: { osquery: { action: 'test' } } },
        { _id: '2', _index: 'test', fields: { osquery: { action: 'test2' } } },
      ];

      const mockResponse = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 10,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits: mockHits,
            total: { value: 2, relation: 'eq' as SearchTotalHitsRelation },
          },
        },
      };

      const result = await allResults.parse(baseOptions, mockResponse);

      expect(result.edges).toEqual(mockHits);
    });
  });
});
