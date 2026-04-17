/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getNotificationPolicyStats } from './get_notification_policy_stats';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;

beforeEach(() => {
  jest.resetAllMocks();
});

function mockSearchResponse({
  total = 5,
  uniqueWorkflowCount = 3,
  countWithMatcher = 2,
  countWithGroupBy = 1,
  avgGroupByFieldsCount = 2.5,
  throttleIntervalBuckets = [
    { key: '5m', doc_count: 3 },
    { key: '1h', doc_count: 2 },
  ],
}: {
  total?: number;
  uniqueWorkflowCount?: number;
  countWithMatcher?: number;
  countWithGroupBy?: number;
  avgGroupByFieldsCount?: number | null;
  throttleIntervalBuckets?: Array<{ key: string; doc_count: number }>;
} = {}) {
  esClient.search.mockResponseOnce({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: total, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {
      unique_workflow_count: { value: uniqueWorkflowCount },
      count_with_matcher: { doc_count: countWithMatcher },
      count_by_throttle_interval: { buckets: throttleIntervalBuckets },
      count_with_group_by: { doc_count: countWithGroupBy },
      avg_group_by_fields_count: { value: avgGroupByFieldsCount },
    },
  } as any);
}

describe('getNotificationPolicyStats', () => {
  it('returns stats from aggregations', async () => {
    mockSearchResponse({});

    const result = await getNotificationPolicyStats(esClient);

    expect(result).toEqual({
      notification_policies_count: 5,
      notification_policies_unique_workflow_count: 3,
      notification_policies_count_with_matcher: 2,
      notification_policies_count_with_group_by: 1,
      notification_policies_avg_group_by_fields_count: 2.5,
      notification_policies_count_by_throttle_interval: [
        {
          name: '5m',
          value: 3,
        },
        {
          name: '1h',
          value: 2,
        },
      ],
    });
  });

  it('returns null avg when no policies have group_by', async () => {
    mockSearchResponse({
      total: 3,
      countWithGroupBy: 0,
      avgGroupByFieldsCount: null,
      throttleIntervalBuckets: [],
    });

    const result = await getNotificationPolicyStats(esClient);

    expect(result.notification_policies_avg_group_by_fields_count).toBeNull();
    expect(result.notification_policies_count_by_throttle_interval).toEqual([]);
  });

  it('returns empty results when no notification policies exist', async () => {
    mockSearchResponse({
      total: 0,
      uniqueWorkflowCount: 0,
      countWithMatcher: 0,
      countWithGroupBy: 0,
      avgGroupByFieldsCount: null,
      throttleIntervalBuckets: [],
    });

    const result = await getNotificationPolicyStats(esClient);

    expect(result).toEqual({
      notification_policies_count: 0,
      notification_policies_unique_workflow_count: 0,
      notification_policies_count_with_matcher: 0,
      notification_policies_count_with_group_by: 0,
      notification_policies_avg_group_by_fields_count: null,
      notification_policies_count_by_throttle_interval: [],
    });
  });

  it('returns defaults when aggregations are undefined', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    } as any);

    const result = await getNotificationPolicyStats(esClient);

    expect(result).toEqual({
      notification_policies_count: 0,
      notification_policies_unique_workflow_count: 0,
      notification_policies_count_with_matcher: 0,
      notification_policies_count_with_group_by: 0,
      notification_policies_avg_group_by_fields_count: null,
      notification_policies_count_by_throttle_interval: [],
    });
  });

  it('handles numeric hits.total format', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: 7, max_score: null, hits: [] },
      aggregations: {
        unique_workflow_count: { value: 4 },
        count_with_matcher: { doc_count: 1 },
        count_by_throttle_interval: { buckets: [] },
        count_with_group_by: { doc_count: 0 },
        avg_group_by_fields_count: { value: null },
      },
    } as any);

    const result = await getNotificationPolicyStats(esClient);

    expect(result.notification_policies_count).toBe(7);
  });
});
