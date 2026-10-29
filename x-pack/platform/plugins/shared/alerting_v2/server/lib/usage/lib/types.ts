/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LatestTaskStateSchema } from '../task_state';

export interface TermsBucket {
  key: string;
  doc_count: number;
}

export interface AlertStatsAggregations {
  count_by_kind: { buckets: TermsBucket[] };
  count_by_source: { buckets: TermsBucket[] };
  count_by_type: { buckets: TermsBucket[] };
  episode_count: { value: number };
  min_timestamp: { value: number | null; value_as_string?: string };
}
export type AlertStatsResults = Pick<
  LatestTaskStateSchema,
  | 'alerts_count'
  | 'alerts_count_by_kind'
  | 'alerts_count_by_source'
  | 'alerts_count_by_type'
  | 'alerts_episode_count'
  | 'alerts_min_timestamp'
  | 'alerts_index_size_bytes'
>;

export interface ActionPolicyStatsAggregations {
  unique_workflow_count: { value: number };
  count_by_throttle_interval: { buckets: TermsBucket[] };
  count_with_group_by: { doc_count: number };
  avg_group_by_fields_count: { value: number | null };
  count_with_matcher: { doc_count: number };
  count_by_status: { buckets: TermsBucket[] };
  count_by_grouping_mode: { buckets: TermsBucket[] };
  count_by_throttle_strategy: { buckets: TermsBucket[] };
  workflows_per_policy_percentiles: { values: Record<string, number | null> };
  workflows_per_policy_avg: { value: number | null };
  count_with_multiple_workflows: { doc_count: number };
}
export type ActionPolicyStatsResults = Pick<
  LatestTaskStateSchema,
  | 'action_policies_count'
  | 'action_policies_unique_workflow_count'
  | 'action_policies_count_with_matcher'
  | 'action_policies_count_with_group_by'
  | 'action_policies_avg_group_by_fields_count'
  | 'action_policies_count_by_throttle_interval'
  | 'action_policies_count_by_status'
  | 'action_policies_count_by_grouping_mode'
  | 'action_policies_count_by_throttle_strategy'
  | 'action_policies_workflows_per_policy'
  | 'action_policies_count_with_multiple_workflows'
>;

export interface ExecutionStatsAggregations {
  count_by_status: { buckets: TermsBucket[] };
  delay_percentiles: { values: Record<string, number | null> };
}
export type ExecutionStatsResults = Pick<
  LatestTaskStateSchema,
  | 'executions_count_24hr'
  | 'executions_count_by_status_24hr'
  | 'executions_delay_p50_ms'
  | 'executions_delay_p75_ms'
  | 'executions_delay_p95_ms'
  | 'executions_delay_p99_ms'
  | 'dispatcher_executions_count_24hr'
>;

export interface ValueAggregation {
  value: number | null;
}
export interface PercentilesAggregation {
  values: Record<string, number | null>;
}

/** Flat aggregations over dispatcher events. */
export interface DispatcherActionBucket extends TermsBucket {
  alert_count: ValueAggregation;
  action_group_count: ValueAggregation;
}
export interface DispatcherEventStatsAggregations {
  by_action: { buckets: DispatcherActionBucket[] };
  dispatched: {
    doc_count: number;
    unique_alerts: ValueAggregation;
    workflow_executions: ValueAggregation;
    unique_workflows: ValueAggregation;
    executions: ValueAggregation;
    spaces: ValueAggregation;
  };
  dispatch_failed: {
    doc_count: number;
    by_reason: { buckets: TermsBucket[] };
  };
}

/** Per-policy aggregations through the nested `kibana.saved_objects` refs. */
export interface DispatcherPolicyBucket extends TermsBucket {
  events: {
    doc_count: number;
    dispatched: {
      doc_count: number;
      action_groups: ValueAggregation;
      alerts: ValueAggregation;
      workflow_executions: ValueAggregation;
    };
    throttled: { doc_count: number; action_groups: ValueAggregation };
    dispatch_failed: { doc_count: number };
    throttle_ratio: ValueAggregation;
  };
}
export interface DispatcherPolicyStatsAggregations {
  policy_refs: {
    policies: {
      by_policy: { buckets: DispatcherPolicyBucket[] };
      action_groups_percentiles: PercentilesAggregation;
      action_groups_avg: ValueAggregation;
      alerts_percentiles: PercentilesAggregation;
      alerts_avg: ValueAggregation;
      workflow_executions_percentiles: PercentilesAggregation;
      workflow_executions_avg: ValueAggregation;
      throttle_ratio_percentiles: PercentilesAggregation;
      throttle_ratio_avg: ValueAggregation;
    };
  };
}

/** Distinct rules referenced by `unmatched` events. */
export interface DispatcherUncoveredRulesAggregations {
  rule_refs: { rules: { uncovered_rules: ValueAggregation } };
}

export type DispatcherStatsResults = Pick<
  LatestTaskStateSchema,
  | 'dispatcher_alerts_count_by_outcome_24hr'
  | 'dispatcher_action_groups_count_by_outcome_24hr'
  | 'dispatcher_unique_alerts_dispatched_count_24hr'
  | 'dispatcher_workflow_executions_count_24hr'
  | 'dispatcher_unique_workflows_triggered_count_24hr'
  | 'dispatcher_notifying_executions_count_24hr'
  | 'dispatcher_notifying_spaces_count_24hr'
  | 'dispatcher_policies_count_by_activity_24hr'
  | 'dispatcher_action_groups_dispatched_per_policy_24hr'
  | 'dispatcher_alerts_dispatched_per_policy_24hr'
  | 'dispatcher_workflow_executions_per_policy_24hr'
  | 'dispatcher_throttle_ratio_per_policy_24hr'
  | 'dispatcher_uncovered_rules_count_24hr'
  | 'dispatcher_dispatch_failures_count_by_reason_24hr'
>;

export interface RuleStatsAggregations {
  count_enabled: { doc_count: number };
  count_by_kind: { buckets: TermsBucket[] };
  count_by_schedule: { buckets: TermsBucket[] };
  count_by_lookback: { buckets: TermsBucket[] };
  avg_pending_count: { value: number | null };
  avg_recovering_count: { value: number | null };
  count_by_pending_timeframe: { buckets: TermsBucket[] };
  count_by_recovering_timeframe: { buckets: TermsBucket[] };
  count_with_grouping: { doc_count: number };
  avg_grouping_fields_count: { value: number | null };
  min_created_at: { value: number | null; value_as_string?: string };
  count_by_recovery_strategy: { buckets: TermsBucket[] };
  count_by_no_data_strategy: { buckets: TermsBucket[] };
}
export type RuleStatsResults = Pick<
  LatestTaskStateSchema,
  | 'count_total'
  | 'count_enabled'
  | 'count_by_kind'
  | 'count_by_schedule'
  | 'count_by_lookback'
  | 'avg_pending_count'
  | 'avg_recovering_count'
  | 'count_by_pending_timeframe'
  | 'count_by_recovering_timeframe'
  | 'count_with_grouping'
  | 'avg_grouping_fields_count'
  | 'min_created_at'
  | 'count_by_recovery_strategy'
  | 'count_by_no_data_strategy'
>;
