/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Usage type for telemetry usage collector.
 */
export interface AlertingV2Usage {
  has_errors: boolean;
  error_messages?: string[];

  // rule stats
  count_total?: number;
  count_enabled?: number;
  count_by_kind?: Record<string, number>;
  count_by_schedule?: Record<string, number>;
  count_by_lookback?: Record<string, number>;
  count_with_query_condition?: number;
  count_with_recovery_policy?: number;
  count_by_recovery_policy_type?: Record<string, number>;
  count_with_recovery_query_condition?: number;
  avg_pending_count?: number | null;
  avg_recovering_count?: number | null;
  count_by_pending_timeframe?: Record<string, number>;
  count_by_recovering_timeframe?: Record<string, number>;
  count_with_grouping?: number;
  avg_grouping_fields_count?: number | null;
  count_with_no_data?: number;
  count_by_no_data_behavior?: Record<string, number>;
  count_by_no_data_timeframe?: Record<string, number>;
  min_created_at?: string | null;

  // execution stats
  executions_count_24hr?: number;
  executions_count_by_status_24hr?: Record<string, number>;
  executions_delay_p50_ms?: number | null;
  executions_delay_p75_ms?: number | null;
  executions_delay_p95_ms?: number | null;
  executions_delay_p99_ms?: number | null;
  dispatcher_executions_count_24hr?: number;

  // notification policy stats
  notification_policies_count?: number;
  notification_policies_unique_workflow_count?: number;
  notification_policies_count_with_matcher?: number;
  notification_policies_count_with_group_by?: number;
  notification_policies_avg_group_by_fields_count?: number | null;
  notification_policies_count_by_throttle_interval?: Record<string, number>;

  // alert event stats
  alerts_count?: number;
  alerts_count_by_kind?: Record<string, number>;
  alerts_count_by_source?: Record<string, number>;
  alerts_count_by_type?: Record<string, number>;
  alerts_episode_count?: number;
  alerts_min_timestamp?: string | null;
  alerts_index_size_bytes?: number | null;
}

export type AlertingV2UsageCollectorSchemaType = AlertingV2Usage & {
  available: boolean;
  enabled: boolean;
};
