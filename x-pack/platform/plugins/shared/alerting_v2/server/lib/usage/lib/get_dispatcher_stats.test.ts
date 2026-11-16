/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getDispatcherStats } from './get_dispatcher_stats';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;

beforeEach(() => {
  jest.resetAllMocks();
});

const searchResponse = (aggregations: unknown) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    aggregations,
  } as any);

const policyBucket = ({
  key,
  dispatched = 0,
  dispatchedGroups = 0,
  throttled = 0,
  throttledGroups = 0,
  failed = 0,
  throttleRatio,
}: {
  key: string;
  dispatched?: number;
  dispatchedGroups?: number;
  throttled?: number;
  throttledGroups?: number;
  failed?: number;
  throttleRatio?: number;
}) => ({
  key,
  doc_count: dispatched + throttled + failed,
  events: {
    doc_count: dispatched + throttled + failed,
    dispatched: { doc_count: dispatched, action_groups: { value: dispatchedGroups } },
    throttled: { doc_count: throttled, action_groups: { value: throttledGroups } },
    dispatch_failed: { doc_count: failed },
  },
  // ES omits the bucket_script result when the script returns null.
  ...(throttleRatio !== undefined ? { throttle_ratio: { value: throttleRatio } } : {}),
});

/** Mirrors a real run: two notifying policies, one throttled-and-failing, one only failing. */
const eventStatsAggregations = {
  by_action: {
    buckets: [
      {
        key: 'dispatch_failed',
        doc_count: 2,
        alert_count: { value: 2 },
        action_group_count: { value: 2 },
      },
      {
        key: 'dispatched',
        doc_count: 2,
        alert_count: { value: 2 },
        action_group_count: { value: 2 },
      },
      {
        key: 'throttled',
        doc_count: 2,
        alert_count: { value: 3 },
        action_group_count: { value: 3 },
      },
      {
        key: 'unmatched',
        doc_count: 2,
        alert_count: { value: 2 },
        action_group_count: { value: 0 },
      },
    ],
  },
  dispatched: {
    doc_count: 2,
    unique_alerts: { value: 2 },
    workflow_executions: { value: 2 },
    unique_workflows: { value: 1 },
    executions: { value: 2 },
    spaces: { value: 1 },
  },
  dispatch_failed: {
    doc_count: 2,
    by_reason: { buckets: [{ key: 'workflow_disabled', doc_count: 2 }] },
  },
  throttled: {
    doc_count: 2,
    by_strategy: {
      buckets: [
        { key: 'time_interval', doc_count: 1, action_groups: { value: 2 } },
        { key: 'every_time', doc_count: 1, action_groups: { value: 1 } },
        { key: 'on_status_change', doc_count: 3, action_groups: { value: 3 } },
      ],
    },
  },
};

const groupingModeBucket = (key: string, p50: number, p99: number, avg: number) => ({
  key,
  doc_count: 1,
  policy_refs: {
    policies: {
      by_policy: { buckets: [] },
      action_groups_percentiles: { values: { '50.0': p50, '99.0': p99 } },
      action_groups_avg: { value: avg },
    },
  },
});

const policyStatsAggregations = {
  policy_refs: {
    policies: {
      by_policy: {
        buckets: [
          policyBucket({
            key: 'failed',
            throttled: 1,
            throttledGroups: 2,
            failed: 2,
            throttleRatio: 1,
          }),
          policyBucket({
            key: 'dispatched',
            dispatched: 1,
            dispatchedGroups: 1,
            throttled: 1,
            throttledGroups: 1,
            throttleRatio: 0.5,
          }),
          policyBucket({ key: 'throttled', dispatched: 1, dispatchedGroups: 1, throttleRatio: 0 }),
          policyBucket({ key: 'only-failed', failed: 3 }),
        ],
      },
      throttle_ratio_percentiles: { values: { '50.0': 0.5, '99.0': 1 } },
      throttle_ratio_avg: { value: 0.5 },
    },
  },
  dispatched_events: {
    doc_count: 2,
    policy_refs: {
      policies: {
        by_policy: { buckets: [] },
        action_groups_percentiles: { values: { '50.0': 1, '99.0': 1 } },
        action_groups_avg: { value: 1 },
        alerts_percentiles: { values: { '50.0': 1, '99.0': 2 } },
        alerts_avg: { value: 1.5 },
        workflow_executions_percentiles: { values: { '50.0': 1, '99.0': 1 } },
        workflow_executions_avg: { value: 1 },
      },
    },
    by_grouping_mode: {
      buckets: [
        groupingModeBucket('per_alert', 1, 1, 1),
        groupingModeBucket('per_field', 2, 4, 2.5),
      ],
    },
  },
  unmatched_events: {
    doc_count: 2,
    rule_refs: { rules: { uncovered_rules: { value: 1 } } },
  },
};

const emptyPercentiles = { values: { '50.0': null, '99.0': null } };
const emptyPolicyStatsAggregations = {
  policy_refs: {
    policies: {
      by_policy: { buckets: [] },
      throttle_ratio_percentiles: emptyPercentiles,
      throttle_ratio_avg: { value: null },
    },
  },
  dispatched_events: {
    doc_count: 0,
    policy_refs: {
      policies: {
        by_policy: { buckets: [] },
        action_groups_percentiles: emptyPercentiles,
        action_groups_avg: { value: null },
        alerts_percentiles: emptyPercentiles,
        alerts_avg: { value: null },
        workflow_executions_percentiles: emptyPercentiles,
        workflow_executions_avg: { value: null },
      },
    },
    by_grouping_mode: { buckets: [] },
  },
  unmatched_events: { doc_count: 0, rule_refs: { rules: { uncovered_rules: { value: 0 } } } },
};
const emptyEventStatsAggregations = {
  by_action: { buckets: [] },
  dispatched: {
    doc_count: 0,
    unique_alerts: { value: 0 },
    workflow_executions: { value: 0 },
    unique_workflows: { value: 0 },
    executions: { value: 0 },
    spaces: { value: 0 },
  },
  dispatch_failed: { doc_count: 0, by_reason: { buckets: [] } },
  throttled: { doc_count: 0, by_strategy: { buckets: [] } },
};

const nullDistribution = { p50: null, p99: null, avg: null };
const emptyStats = {
  dispatcher_alerts_count_by_outcome_24hr: {},
  dispatcher_action_groups_count_by_outcome_24hr: {},
  dispatcher_unique_alerts_dispatched_count_24hr: 0,
  dispatcher_workflow_executions_count_24hr: 0,
  dispatcher_unique_workflows_triggered_count_24hr: 0,
  dispatcher_notifying_executions_count_24hr: 0,
  dispatcher_notifying_spaces_count_24hr: 0,
  dispatcher_dispatch_failures_count_by_reason_24hr: {},
  dispatcher_policies_count_by_activity_24hr: {
    dispatched: 0,
    throttled: 0,
    failing: 0,
    broken: 0,
  },
  dispatcher_action_groups_dispatched_per_policy_24hr: nullDistribution,
  dispatcher_alerts_dispatched_per_policy_24hr: nullDistribution,
  dispatcher_workflow_executions_per_policy_24hr: nullDistribution,
  dispatcher_throttle_ratio_per_policy_24hr: nullDistribution,
  dispatcher_uncovered_rules_count_24hr: 0,
  dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr: {},
  dispatcher_action_groups_throttled_count_by_strategy_24hr: {},
};

// The getter issues the event stats search first and the per-policy search second.
const mockSearches = (eventAggs: unknown, policyAggs: unknown) => {
  esClient.search.mockResponseOnce(searchResponse(eventAggs));
  esClient.search.mockResponseOnce(searchResponse(policyAggs));
};

describe('getDispatcherStats', () => {
  it('returns stats from aggregations', async () => {
    mockSearches(eventStatsAggregations, policyStatsAggregations);

    const result = await getDispatcherStats(esClient);

    expect(result).toEqual({
      dispatcher_alerts_count_by_outcome_24hr: { dispatched: 2, throttled: 3, unmatched: 2 },
      dispatcher_action_groups_count_by_outcome_24hr: { dispatched: 2, throttled: 3 },
      dispatcher_unique_alerts_dispatched_count_24hr: 2,
      dispatcher_workflow_executions_count_24hr: 2,
      dispatcher_unique_workflows_triggered_count_24hr: 1,
      dispatcher_notifying_executions_count_24hr: 2,
      dispatcher_notifying_spaces_count_24hr: 1,
      dispatcher_dispatch_failures_count_by_reason_24hr: { workflow_disabled: 2 },
      dispatcher_policies_count_by_activity_24hr: {
        dispatched: 2,
        throttled: 2,
        failing: 2,
        broken: 2,
      },
      dispatcher_action_groups_dispatched_per_policy_24hr: { p50: 1, p99: 1, avg: 1 },
      dispatcher_alerts_dispatched_per_policy_24hr: { p50: 1, p99: 2, avg: 1.5 },
      dispatcher_workflow_executions_per_policy_24hr: { p50: 1, p99: 1, avg: 1 },
      dispatcher_throttle_ratio_per_policy_24hr: { p50: 0.5, p99: 1, avg: 0.5 },
      dispatcher_uncovered_rules_count_24hr: 1,
      dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr: {
        per_alert: { p50: 1, p99: 1, avg: 1 },
        per_field: { p50: 2, p99: 4, avg: 2.5 },
      },
      dispatcher_action_groups_throttled_count_by_strategy_24hr: {
        time_interval: 2,
        every_time: 1,
        on_status_change: 3,
      },
    });
  });

  it('counts a policy as broken only when it failed and dispatched nothing', async () => {
    mockSearches(emptyEventStatsAggregations, {
      ...emptyPolicyStatsAggregations,
      policy_refs: {
        policies: {
          ...emptyPolicyStatsAggregations.policy_refs.policies,
          by_policy: {
            buckets: [
              policyBucket({ key: 'recovered', dispatched: 1, failed: 1, throttleRatio: 0 }),
              policyBucket({ key: 'broken', failed: 1 }),
            ],
          },
        },
      },
    });

    const result = await getDispatcherStats(esClient);

    expect(result.dispatcher_policies_count_by_activity_24hr).toEqual({
      dispatched: 1,
      throttled: 0,
      failing: 2,
      broken: 1,
    });
  });

  it('leaves outcomes without events undefined and ignores the dispatch_failed sums', async () => {
    mockSearches(
      {
        ...emptyEventStatsAggregations,
        by_action: {
          buckets: [
            {
              key: 'dispatch_failed',
              doc_count: 5,
              alert_count: { value: 5 },
              action_group_count: { value: 5 },
            },
            {
              key: 'unmatched',
              doc_count: 1,
              alert_count: { value: 4 },
              action_group_count: { value: 0 },
            },
          ],
        },
      },
      emptyPolicyStatsAggregations
    );

    const result = await getDispatcherStats(esClient);

    expect(result.dispatcher_alerts_count_by_outcome_24hr).toEqual({ unmatched: 4 });
    expect(result.dispatcher_action_groups_count_by_outcome_24hr).toEqual({});
  });

  it('ignores strategy and grouping mode values outside the known vocabularies', async () => {
    // Events written by other versions can carry values the schema no longer accepts; letting
    // them through would make Task Manager reject the whole state.
    mockSearches(
      {
        ...emptyEventStatsAggregations,
        throttled: {
          doc_count: 2,
          by_strategy: {
            buckets: [
              { key: 'none', doc_count: 1, action_groups: { value: 4 } },
              { key: 'every_time', doc_count: 1, action_groups: { value: 1 } },
            ],
          },
        },
      },
      {
        ...emptyPolicyStatsAggregations,
        dispatched_events: {
          ...emptyPolicyStatsAggregations.dispatched_events,
          by_grouping_mode: {
            buckets: [groupingModeBucket('per_rule', 9, 9, 9), groupingModeBucket('all', 1, 1, 1)],
          },
        },
      }
    );

    const result = await getDispatcherStats(esClient);

    expect(result.dispatcher_action_groups_throttled_count_by_strategy_24hr).toEqual({
      every_time: 1,
    });
    expect(result.dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr).toEqual({
      all: { p50: 1, p99: 1, avg: 1 },
    });
  });

  it('returns empty results when there are no dispatcher events', async () => {
    mockSearches(emptyEventStatsAggregations, emptyPolicyStatsAggregations);

    const result = await getDispatcherStats(esClient);

    expect(result).toEqual(emptyStats);
  });

  it('returns defaults when aggregations are undefined', async () => {
    mockSearches(undefined, undefined);

    const result = await getDispatcherStats(esClient);

    expect(result).toEqual(emptyStats);
  });

  describe('query', () => {
    const getRequests = () => esClient.search.mock.calls.map(([request]) => request as any);

    beforeEach(() => {
      mockSearches(emptyEventStatsAggregations, emptyPolicyStatsAggregations);
    });

    it('scopes both searches to dispatcher events of the last 24 hours', async () => {
      await getDispatcherStats(esClient);

      for (const request of getRequests()) {
        expect(request.index).toBe('.kibana-event-log-*');
        expect(request.size).toBe(0);
        expect(request.query.bool.filter).toEqual([
          { term: { 'event.provider': 'alerting_v2' } },
          { range: { '@timestamp': { gte: 'now-24h' } } },
        ]);
      }
    });

    it('sets an explicit precision threshold on every cardinality, higher for alert ids', async () => {
      await getDispatcherStats(esClient);

      const [events, policies] = getRequests();
      const { dispatched } = events.aggs;
      expect(dispatched.aggs.unique_alerts.cardinality.precision_threshold).toBe(10000);
      for (const name of ['workflow_executions', 'unique_workflows', 'executions', 'spaces']) {
        expect(dispatched.aggs[name].cardinality.precision_threshold).toBe(3000);
      }
      expect(
        policies.aggs.unmatched_events.aggs.rule_refs.aggs.rules.aggs.uncovered_rules.cardinality
          .precision_threshold
      ).toBe(3000);
    });

    it('splits throttled groups by strategy and dispatched groups per policy by grouping mode', async () => {
      await getDispatcherStats(esClient);

      const [events, policies] = getRequests();
      expect(events.aggs.throttled.aggs.by_strategy.terms.field).toBe(
        'kibana.alerting_v2.dispatcher.throttle_strategy'
      );
      const byGroupingMode = policies.aggs.dispatched_events.aggs.by_grouping_mode;
      expect(byGroupingMode.terms.field).toBe('kibana.alerting_v2.dispatcher.grouping_mode');
      expect(
        byGroupingMode.aggs.policy_refs.aggs.policies.aggs.action_groups_percentiles
          .percentiles_bucket.buckets_path
      ).toBe('by_policy>events>action_groups');
    });

    it('bounds the per-policy terms and derives the throttle ratio at the terms level', async () => {
      await getDispatcherStats(esClient);

      const [, policies] = getRequests();
      const byPolicy = policies.aggs.policy_refs.aggs.policies.aggs.by_policy;
      expect(byPolicy.terms).toEqual({ field: 'kibana.saved_objects.id', size: 100 });
      // ES rejects a bucket_script under the single-bucket reverse_nested.
      expect(byPolicy.aggs.throttle_ratio.bucket_script.buckets_path).toEqual({
        throttled: 'events>throttled>action_groups',
        dispatched: 'events>dispatched>action_groups',
      });
      expect(byPolicy.aggs.events.reverse_nested).toEqual({});
    });
  });
});
