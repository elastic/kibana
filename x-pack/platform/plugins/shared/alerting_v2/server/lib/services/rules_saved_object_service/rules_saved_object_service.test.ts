/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISavedObjectsPointInTimeFinder,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RulesSavedObjectService } from './rules_saved_object_service';
import { createRulesSavedObjectService } from './rules_saved_object_service.mock';

interface ScheduleAggregations {
  schedule_intervals: {
    sum_other_doc_count: number;
    buckets: Array<{ key: string; doc_count: number }>;
  };
}

const buildFindResponse = <T = unknown, A = unknown>(
  overrides: Partial<SavedObjectsFindResponse<T, A>> = {}
): SavedObjectsFindResponse<T, A> => ({
  saved_objects: [],
  total: 0,
  page: 1,
  per_page: 20,
  ...overrides,
});

const buildFindResult = (id: string): SavedObjectsFindResult<unknown> => ({
  id,
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {},
  references: [],
  score: 0,
});

const buildAggregationResponse = (buckets: Array<{ key: string; doc_count: number }>) =>
  buildFindResponse<unknown, ScheduleAggregations>({
    aggregations: { schedule_intervals: { sum_other_doc_count: 0, buckets } },
  });

interface MatchCountAggregations {
  match_count: { value: number };
}

const buildMatchCountResponse = (value: number, total = value) =>
  buildFindResponse<unknown, MatchCountAggregations>({
    total,
    per_page: 0,
    aggregations: { match_count: { value } },
  });

const MATCH_COUNT_AGGS = { match_count: { value_count: { field: 'type' } } };

describe('RulesSavedObjectService', () => {
  let rulesSavedObjectService: RulesSavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    ({ rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService());
  });

  describe('getTotalScheduledPerMinute', () => {
    it('aggregates enabled rules across all spaces and sums their per-minute frequency', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(
        buildAggregationResponse([
          { key: '1m', doc_count: 3 }, // 3 * 1 = 3
          { key: '30s', doc_count: 2 }, // 2 * 2 = 4
          { key: '5m', doc_count: 5 }, // 5 * 0.2 = 1
        ])
      );

      const total = await rulesSavedObjectService.getTotalScheduledPerMinute();

      expect(total).toBeCloseTo(8);
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RULE_SAVED_OBJECT_TYPE,
          perPage: 0,
          namespaces: ['*'],
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
          aggs: expect.objectContaining({
            schedule_intervals: {
              terms: expect.objectContaining({
                field: `${RULE_SAVED_OBJECT_TYPE}.attributes.schedule.every`,
              }),
            },
          }),
        })
      );
    });

    it('returns 0 when there are no aggregation results', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(buildFindResponse());

      expect(await rulesSavedObjectService.getTotalScheduledPerMinute()).toBe(0);
    });
  });

  describe('countByQuery', () => {
    it('returns the exact match count from the value_count aggregation and threads the selectors through', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(buildMatchCountResponse(42));

      const total = await rulesSavedObjectService.countByQuery({
        filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
        search: 'prod*',
        searchFields: ['metadata.name'],
      });

      expect(total).toBe(42);
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
        search: 'prod*',
        searchFields: ['metadata.name'],
        defaultSearchOperator: 'AND',
        aggs: MATCH_COUNT_AGGS,
      });
    });

    it('omits filter and search from the request when they are not provided', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(buildMatchCountResponse(7));

      const total = await rulesSavedObjectService.countByQuery({});

      expect(total).toBe(7);
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_SAVED_OBJECT_TYPE,
        perPage: 0,
        aggs: MATCH_COUNT_AGGS,
      });
    });
  });

  describe('getRuleIdsByQuery', () => {
    /**
     * Configures `createPointInTimeFinder` to yield the given pages.
     */
    const stubFinder = (pages: string[][]) => {
      const close = jest.fn().mockResolvedValue(undefined);
      const finder: ISavedObjectsPointInTimeFinder<unknown, unknown> = {
        find: async function* find() {
          for (const page of pages) {
            yield buildFindResponse({
              saved_objects: page.map((id) => buildFindResult(id)),
              total: page.length,
              per_page: page.length,
            });
          }
        },
        close,
      };
      mockSavedObjectsClient.createPointInTimeFinder.mockReturnValueOnce(finder);
      return { close };
    };

    it('returns [] without opening the PIT when maxItems is 0', async () => {
      const result = await rulesSavedObjectService.getRuleIdsByQuery({ maxItems: 0 });

      expect(result).toEqual([]);
      expect(mockSavedObjectsClient.createPointInTimeFinder).not.toHaveBeenCalled();
    });

    it('collects ids across pages', async () => {
      const { close } = stubFinder([
        ['a', 'b'],
        ['c', 'd'],
      ]);

      const result = await rulesSavedObjectService.getRuleIdsByQuery({ maxItems: 100 });

      expect(result).toEqual(['a', 'b', 'c', 'd']);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('caps the returned ids at maxItems, mid-page if needed', async () => {
      const { close } = stubFinder([
        ['a', 'b'],
        ['c', 'd', 'e', 'f'],
      ]);

      const result = await rulesSavedObjectService.getRuleIdsByQuery({ maxItems: 3 });

      expect(result).toEqual(['a', 'b', 'c']);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('closes the finder even when the caller cap is reached before the last page', async () => {
      const { close } = stubFinder([
        ['a', 'b'],
        ['c', 'd'],
      ]);

      await rulesSavedObjectService.getRuleIdsByQuery({ maxItems: 2 });

      expect(close).toHaveBeenCalledTimes(1);
    });

    it('threads filter, search and searchFields through to the finder', async () => {
      stubFinder([['a']]);

      await rulesSavedObjectService.getRuleIdsByQuery({
        filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
        search: 'prod',
        searchFields: ['metadata.name'],
        maxItems: 10,
      });

      expect(mockSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
          search: 'prod',
          searchFields: ['metadata.name'],
          defaultSearchOperator: 'AND',
        })
      );
    });
  });
});
