/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * WARNING: Do not modify the existing versioned schema(s) below; add a new version instead.
 * Required for zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * When adding fields, introduce `stateSchemaV2` (etc.), extend `stateSchemaByVersion`, and point
 * `latestTaskStateSchema` at the newest version.
 */

const stateSchemaV1 = schema.object({
  has_errors: schema.boolean(),
  error_messages: schema.maybe(schema.arrayOf(schema.string())),
  runs: schema.number(),

  // Total rule counts
  count_total: schema.maybe(schema.number()),
  count_enabled: schema.maybe(schema.number()),

  // Distribution aggs
  count_by_kind: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  count_by_schedule: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  count_by_lookback: schema.maybe(schema.recordOf(schema.string(), schema.number())),

  // evaluation.query.condition
  count_with_query_condition: schema.maybe(schema.number()),

  // recovery_policy fields (enabled:false in mappings, computed via runtime fields)
  count_with_recovery_policy: schema.maybe(schema.number()),
  count_by_recovery_policy_type: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  count_with_recovery_query_condition: schema.maybe(schema.number()),

  // state_transition fields (enabled:false in mappings, computed via runtime fields)
  count_by_pending_timeframe: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  count_by_recovering_timeframe: schema.maybe(schema.recordOf(schema.string(), schema.number())),

  // grouping fields
  count_with_grouping: schema.maybe(schema.number()),
  avg_grouping_fields_count: schema.maybe(schema.nullable(schema.number())),

  // no_data fields (enabled:false in mappings, computed via runtime fields)
  count_with_no_data: schema.maybe(schema.number()),
  count_by_no_data_behavior: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  count_by_no_data_timeframe: schema.maybe(schema.recordOf(schema.string(), schema.number())),

  // notification policies
  count_notification_policies: schema.maybe(schema.number()),

  // date stats
  min_created_at: schema.maybe(schema.nullable(schema.string())),

  // notification policy stats
  notification_policies_count: schema.maybe(schema.number()),
  notification_policies_unique_workflow_count: schema.maybe(schema.number()),
  notification_policies_count_with_matcher: schema.maybe(schema.number()),
  notification_policies_count_with_group_by: schema.maybe(schema.number()),
  notification_policies_avg_group_by_fields_count: schema.maybe(schema.nullable(schema.number())),
  notification_policies_count_by_throttle_interval: schema.maybe(
    schema.recordOf(schema.string(), schema.number())
  ),

  // alert event stats
  alerts_count: schema.maybe(schema.number()),
  alerts_count_by_kind: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  alerts_count_by_source: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  alerts_count_by_type: schema.maybe(schema.recordOf(schema.string(), schema.number())),
  alerts_episode_count: schema.maybe(schema.number()),
  alerts_min_timestamp: schema.maybe(schema.nullable(schema.string())),
  alerts_index_size_bytes: schema.maybe(schema.nullable(schema.number())),
});

export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      has_errors: state.has_errors ?? false,
      error_messages: state.error_messages ?? undefined,
      runs: state.runs ?? 0,
      count_total: state.count_total ?? undefined,
      count_enabled: state.count_enabled ?? undefined,
      count_by_kind: state.count_by_kind ?? undefined,
      count_by_schedule: state.count_by_schedule ?? undefined,
      count_by_lookback: state.count_by_lookback ?? undefined,
      count_with_query_condition: state.count_with_query_condition ?? undefined,
      count_with_recovery_policy: state.count_with_recovery_policy ?? undefined,
      count_by_recovery_policy_type: state.count_by_recovery_policy_type ?? undefined,
      count_with_recovery_query_condition: state.count_with_recovery_query_condition ?? undefined,
      count_by_pending_timeframe: state.count_by_pending_timeframe ?? undefined,
      count_by_recovering_timeframe: state.count_by_recovering_timeframe ?? undefined,
      count_with_grouping: state.count_with_grouping ?? undefined,
      avg_grouping_fields_count:
        state.avg_grouping_fields_count !== undefined ? state.avg_grouping_fields_count : undefined,
      count_with_no_data: state.count_with_no_data ?? undefined,
      count_by_no_data_behavior: state.count_by_no_data_behavior ?? undefined,
      count_by_no_data_timeframe: state.count_by_no_data_timeframe ?? undefined,
      count_notification_policies: state.count_notification_policies ?? undefined,
      min_created_at: state.min_created_at !== undefined ? state.min_created_at : undefined,
      notification_policies_count: state.notification_policies_count ?? undefined,
      notification_policies_unique_workflow_count:
        state.notification_policies_unique_workflow_count ?? undefined,
      notification_policies_count_with_matcher:
        state.notification_policies_count_with_matcher ?? undefined,
      notification_policies_count_with_group_by:
        state.notification_policies_count_with_group_by ?? undefined,
      notification_policies_avg_group_by_fields_count:
        state.notification_policies_avg_group_by_fields_count !== undefined
          ? state.notification_policies_avg_group_by_fields_count
          : undefined,
      notification_policies_count_by_throttle_interval:
        state.notification_policies_count_by_throttle_interval ?? undefined,
      alerts_count: state.alerts_count ?? undefined,
      alerts_count_by_kind: state.alerts_count_by_kind ?? undefined,
      alerts_count_by_source: state.alerts_count_by_source ?? undefined,
      alerts_count_by_type: state.alerts_count_by_type ?? undefined,
      alerts_episode_count: state.alerts_episode_count ?? undefined,
      alerts_min_timestamp:
        state.alerts_min_timestamp !== undefined ? state.alerts_min_timestamp : undefined,
      alerts_index_size_bytes:
        state.alerts_index_size_bytes !== undefined ? state.alerts_index_size_bytes : undefined,
    }),
    schema: stateSchemaV1,
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  has_errors: false,
  error_messages: undefined,
  runs: 0,
};
