/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getActionPolicyStats } from './get_action_policy_stats';

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
  statusBuckets = [
    { key: 'enabled', doc_count: 3 },
    { key: 'disabled', doc_count: 1 },
    { key: 'snoozed', doc_count: 1 },
  ],
  groupingModeBuckets = [
    { key: 'per_alert', doc_count: 4 },
    { key: 'per_field', doc_count: 1 },
  ],
  throttleStrategyBuckets = [
    { key: 'none', doc_count: 2 },
    { key: 'time_interval', doc_count: 3 },
  ],
  workflowsPerPolicyPercentiles = { '50.0': 1, '99.0': 4 },
  workflowsPerPolicyAvg = 1.6,
  countWithMultipleWorkflows = 2,
}: {
  total?: number;
  uniqueWorkflowCount?: number;
  countWithMatcher?: number;
  countWithGroupBy?: number;
  avgGroupByFieldsCount?: number | null;
  throttleIntervalBuckets?: Array<{ key: string; doc_count: number }>;
  statusBuckets?: Array<{ key: string; doc_count: number }>;
  groupingModeBuckets?: Array<{ key: string; doc_count: number }>;
  throttleStrategyBuckets?: Array<{ key: string; doc_count: number }>;
  workflowsPerPolicyPercentiles?: Record<string, number | null>;
  workflowsPerPolicyAvg?: number | null;
  countWithMultipleWorkflows?: number;
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
      count_by_status: { buckets: statusBuckets },
      count_by_grouping_mode: { buckets: groupingModeBuckets },
      count_by_throttle_strategy: { buckets: throttleStrategyBuckets },
      workflows_per_policy_percentiles: { values: workflowsPerPolicyPercentiles },
      workflows_per_policy_avg: { value: workflowsPerPolicyAvg },
      count_with_multiple_workflows: { doc_count: countWithMultipleWorkflows },
    },
  } as any);
}

const emptyStats = {
  action_policies_count: 0,
  action_policies_unique_workflow_count: 0,
  action_policies_count_with_matcher: 0,
  action_policies_count_with_group_by: 0,
  action_policies_avg_group_by_fields_count: null,
  action_policies_count_by_throttle_interval: [],
  action_policies_count_by_status: {},
  action_policies_count_by_grouping_mode: {},
  action_policies_count_by_throttle_strategy: {},
  action_policies_workflows_per_policy: { p50: null, p99: null, avg: null },
  action_policies_count_with_multiple_workflows: 0,
};

describe('getActionPolicyStats', () => {
  it('returns stats from aggregations', async () => {
    mockSearchResponse({});

    const result = await getActionPolicyStats(esClient);

    expect(result).toEqual({
      action_policies_count: 5,
      action_policies_unique_workflow_count: 3,
      action_policies_count_with_matcher: 2,
      action_policies_count_with_group_by: 1,
      action_policies_avg_group_by_fields_count: 2.5,
      action_policies_count_by_throttle_interval: [
        {
          name: '5m',
          value: 3,
        },
        {
          name: '1h',
          value: 2,
        },
      ],
      action_policies_count_by_status: { enabled: 3, disabled: 1, snoozed: 1 },
      action_policies_count_by_grouping_mode: { per_alert: 4, per_field: 1 },
      action_policies_count_by_throttle_strategy: { none: 2, time_interval: 3 },
      action_policies_workflows_per_policy: { p50: 1, p99: 4, avg: 1.6 },
      action_policies_count_with_multiple_workflows: 2,
    });
  });

  it('returns null avg when no policies have group_by', async () => {
    mockSearchResponse({
      total: 3,
      countWithGroupBy: 0,
      avgGroupByFieldsCount: null,
      throttleIntervalBuckets: [],
    });

    const result = await getActionPolicyStats(esClient);

    expect(result.action_policies_avg_group_by_fields_count).toBeNull();
    expect(result.action_policies_count_by_throttle_interval).toEqual([]);
  });

  it('returns empty results when no action policies exist', async () => {
    mockSearchResponse({
      total: 0,
      uniqueWorkflowCount: 0,
      countWithMatcher: 0,
      countWithGroupBy: 0,
      avgGroupByFieldsCount: null,
      throttleIntervalBuckets: [],
      statusBuckets: [],
      groupingModeBuckets: [],
      throttleStrategyBuckets: [],
      workflowsPerPolicyPercentiles: { '50.0': null, '99.0': null },
      workflowsPerPolicyAvg: null,
      countWithMultipleWorkflows: 0,
    });

    const result = await getActionPolicyStats(esClient);

    expect(result).toEqual(emptyStats);
  });

  it('returns defaults when aggregations are undefined', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    } as any);

    const result = await getActionPolicyStats(esClient);

    expect(result).toEqual(emptyStats);
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
        count_by_status: { buckets: [] },
        count_by_grouping_mode: { buckets: [] },
        count_by_throttle_strategy: { buckets: [] },
        workflows_per_policy_percentiles: { values: {} },
        workflows_per_policy_avg: { value: null },
        count_with_multiple_workflows: { doc_count: 0 },
      },
    } as any);

    const result = await getActionPolicyStats(esClient);

    expect(result.action_policies_count).toBe(7);
  });

  describe('runtime fields', () => {
    const getRuntimeMappings = () => {
      const [request] = esClient.search.mock.calls[0];
      return (request as any).runtime_mappings as Record<
        string,
        { script: { source: string; params?: Record<string, unknown> } }
      >;
    };

    it('passes the current time to the status script so snoozedUntil is compared against it', async () => {
      mockSearchResponse({});
      const now = new Date('2026-10-28T10:00:00.000Z');

      await getActionPolicyStats(esClient, now);

      const { ap_status: status } = getRuntimeMappings();
      expect(status.script.params).toEqual({ now: now.getTime() });
      // Strictly greater: a snooze that ends exactly now is no longer a snooze.
      expect(status.script.source).toContain('snoozedUntilMs > params.now');
    });

    it('counts a policy with an unparseable snoozedUntil as enabled instead of failing the query', async () => {
      mockSearchResponse({});

      await getActionPolicyStats(esClient);

      const { ap_status: status } = getRuntimeMappings();
      expect(status.script.source).toMatch(
        /try \{\s*long snoozedUntilMs = ZonedDateTime\.parse\(snoozedUntil\)[\s\S]*\} catch \(Exception e\) \{[\s\S]*emit\('enabled'\)/
      );
    });

    it('counts a policy without grouping as per_alert', async () => {
      mockSearchResponse({});

      await getActionPolicyStats(esClient);

      const { ap_grouping_mode: groupingMode } = getRuntimeMappings();
      expect(groupingMode.script.source).toContain("emit('per_alert')");
    });

    it('counts a policy without throttle or without strategy as none', async () => {
      mockSearchResponse({});

      await getActionPolicyStats(esClient);

      const { ap_throttle_strategy: throttleStrategy } = getRuntimeMappings();
      expect(throttleStrategy.script.source).toContain(
        "if (throttle != null && throttle['strategy'] != null)"
      );
      expect(throttleStrategy.script.source).toContain("emit('none')");
    });

    it('counts zero destinations for a policy without a destinations array', async () => {
      mockSearchResponse({});

      await getActionPolicyStats(esClient);

      const { ap_destinations_count: destinationsCount } = getRuntimeMappings();
      expect(destinationsCount.script.source).toContain('destinations == null ? 0L');
    });
  });
});
