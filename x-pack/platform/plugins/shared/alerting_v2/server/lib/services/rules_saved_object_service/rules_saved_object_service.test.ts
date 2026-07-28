/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RulesSavedObjectService } from './rules_saved_object_service';
import { createRulesSavedObjectService } from './rules_saved_object_service.mock';

const mockAggregationResponse = (buckets: Array<{ key: string; doc_count: number }>) =>
  ({
    saved_objects: [],
    total: 0,
    page: 1,
    per_page: 0,
    aggregations: {
      schedule_intervals: { sum_other_doc_count: 0, buckets },
    },
  } as unknown as Awaited<ReturnType<SavedObjectsClientContract['find']>>);

describe('RulesSavedObjectService', () => {
  let rulesSavedObjectService: RulesSavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    ({ rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService());
  });

  describe('getTotalScheduledPerMinute', () => {
    it('aggregates enabled rules across all spaces and sums their per-minute frequency', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(
        mockAggregationResponse([
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
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
      } as Awaited<ReturnType<SavedObjectsClientContract['find']>>);

      expect(await rulesSavedObjectService.getTotalScheduledPerMinute()).toBe(0);
    });
  });

  describe('findTags', () => {
    const mockTagsResponse = (buckets: Array<{ key: string }>) =>
      ({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
        aggregations: { tags: { buckets } },
      } as unknown as Awaited<ReturnType<SavedObjectsClientContract['find']>>);

    it('aggregates tags with size 20 and _count:desc when no search or filter', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(
        mockTagsResponse([{ key: 'cpu' }, { key: 'memory' }])
      );

      const tags = await rulesSavedObjectService.findTags();

      expect(tags).toEqual(['cpu', 'memory']);
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RULE_SAVED_OBJECT_TYPE,
          perPage: 0,
          aggs: {
            tags: expect.objectContaining({
              terms: expect.objectContaining({ size: 20, order: { _count: 'desc' } }),
            }),
          },
        })
      );
    });

    it('does not include an include pattern when search is absent', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(mockTagsResponse([]));

      await rulesSavedObjectService.findTags();

      const call = mockSavedObjectsClient.find.mock.calls[0][0];
      expect((call.aggs as any).tags.terms).not.toHaveProperty('include');
    });

    it('adds an escaped prefix include pattern when search is provided', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(mockTagsResponse([{ key: 'production' }]));

      await rulesSavedObjectService.findTags({ search: 'pro' });

      const call = mockSavedObjectsClient.find.mock.calls[0][0];
      expect((call.aggs as any).tags.terms.include).toBe('pro.*');
    });

    it('escapes regex special characters in the search prefix', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(mockTagsResponse([]));

      await rulesSavedObjectService.findTags({ search: 'a.b+c' });

      const call = mockSavedObjectsClient.find.mock.calls[0][0];
      expect((call.aggs as any).tags.terms.include).toBe('a\\.b\\+c.*');
    });

    it('forwards the SO filter when provided', async () => {
      mockSavedObjectsClient.find.mockResolvedValue(mockTagsResponse([{ key: 'tag' }]));

      await rulesSavedObjectService.findTags({
        filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.kind: alert`,
      });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.kind: alert`,
        })
      );
    });

    it('returns empty array when aggregations are missing', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
      } as Awaited<ReturnType<SavedObjectsClientContract['find']>>);

      const tags = await rulesSavedObjectService.findTags();

      expect(tags).toEqual([]);
    });
  });
});
