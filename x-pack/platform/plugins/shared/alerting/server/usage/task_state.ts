/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */

const stateSchemaV1 = schema.object({
  has_errors: schema.boolean(),
  error_messages: schema.maybe(schema.arrayOf(schema.any())),
  runs: schema.number(),
  count_total: schema.number(),
  count_by_type: schema.recordOf(schema.string(), schema.number()),
  throttle_time: schema.object({
    min: schema.string(),
    avg: schema.string(),
    max: schema.string(),
  }),
  schedule_time: schema.object({
    min: schema.string(),
    avg: schema.string(),
    max: schema.string(),
  }),
  throttle_time_number_s: schema.object({
    min: schema.number(),
    avg: schema.number(),
    max: schema.number(),
  }),
  schedule_time_number_s: schema.object({
    min: schema.number(),
    avg: schema.number(),
    max: schema.number(),
  }),
  connectors_per_alert: schema.object({
    min: schema.number(),
    avg: schema.number(),
    max: schema.number(),
  }),
  count_active_by_type: schema.recordOf(schema.string(), schema.number()),
  count_active_total: schema.number(),
  count_disabled_total: schema.number(),
  count_rules_by_execution_status: schema.object({
    success: schema.number(),
    error: schema.number(),
    warning: schema.number(),
  }),
  count_rules_with_tags: schema.number(),
  count_rules_by_notify_when: schema.object({
    on_action_group_change: schema.number(),
    on_active_alert: schema.number(),
    on_throttle_interval: schema.number(),
  }),
  count_rules_snoozed: schema.number(),
  count_rules_muted: schema.number(),
  count_rules_with_muted_alerts: schema.number(),
  count_connector_types_by_consumers: schema.recordOf(
    schema.string(),
    schema.recordOf(schema.string(), schema.number())
  ),
  count_rules_namespaces: schema.number(),
  count_rules_executions_per_day: schema.number(),
  count_rules_executions_by_type_per_day: schema.recordOf(schema.string(), schema.number()),
  count_rules_executions_failured_per_day: schema.number(),
  count_rules_executions_failured_by_reason_per_day: schema.recordOf(
    schema.string(),
    schema.number()
  ),
  count_rules_executions_failured_by_reason_by_type_per_day: schema.recordOf(
    schema.string(),
    schema.recordOf(schema.string(), schema.number())
  ),
  count_rules_by_execution_status_per_day: schema.recordOf(schema.string(), schema.number()),
  count_rules_executions_timeouts_per_day: schema.number(),
  count_rules_executions_timeouts_by_type_per_day: schema.recordOf(
    schema.string(),
    schema.number()
  ),
  count_failed_and_unrecognized_rule_tasks_per_day: schema.number(),
  count_failed_and_unrecognized_rule_tasks_by_status_per_day: schema.recordOf(
    schema.string(),
    schema.number()
  ),
  count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: schema.recordOf(
    schema.string(),
    schema.recordOf(schema.string(), schema.number())
  ),
  avg_execution_time_per_day: schema.number(),
  avg_execution_time_by_type_per_day: schema.recordOf(schema.string(), schema.number()),
  avg_es_search_duration_per_day: schema.number(),
  avg_es_search_duration_by_type_per_day: schema.recordOf(schema.string(), schema.number()),
  avg_total_search_duration_per_day: schema.number(),
  avg_total_search_duration_by_type_per_day: schema.recordOf(schema.string(), schema.number()),
  percentile_num_generated_actions_per_day: schema.recordOf(schema.string(), schema.number()),
  percentile_num_generated_actions_by_type_per_day: schema.recordOf(
    schema.string(),
    schema.recordOf(schema.string(), schema.number())
  ),
  percentile_num_alerts_per_day: schema.recordOf(schema.string(), schema.number()),
  percentile_num_alerts_by_type_per_day: schema.recordOf(
    schema.string(),
    schema.recordOf(schema.string(), schema.number())
  ),
});

const stateSchemaV2 = stateSchemaV1.extends({
  count_mw_total: schema.number(),
  count_mw_with_repeat_toggle_on: schema.number(),
  count_mw_with_filter_alert_toggle_on: schema.number(),
  count_alerts_total: schema.number(),
  count_alerts_by_rule_type: schema.recordOf(schema.string(), schema.number()),
});

const stateSchemaV3 = stateSchemaV2.extends({
  count_rules_with_linked_dashboards: schema.number(),
  count_rules_with_investigation_guide: schema.number(),
});

const stateSchemaV4 = stateSchemaV3.extends({
  count_rules_snoozed_by_type: schema.recordOf(schema.string(), schema.number()),
  count_rules_muted_by_type: schema.recordOf(schema.string(), schema.number()),
});

const stateSchemaV5 = stateSchemaV4.extends({
  count_ignored_fields_by_rule_type: schema.recordOf(schema.string(), schema.number()),
});

const stateSchemaV6 = stateSchemaV5.extends({
  count_backfill_executions: schema.number(),
  count_backfills_by_execution_status_per_day: schema.recordOf(schema.string(), schema.number()),
  count_gaps: schema.number(),
  total_unfilled_gap_duration_ms: schema.number(),
  total_filled_gap_duration_ms: schema.number(),
});

const stateSchemaV7 = stateSchemaV6.extends({
  count_rules_with_api_key_created_by_user: schema.number(),
});

const stateSchemaV8 = stateSchemaV7.extends({
  count_rules_with_elasticagent_tag: schema.number(),
  count_rules_with_elasticagent_tag_by_type: schema.recordOf(schema.string(), schema.number()),
});

export const stateSchemaByVersion = {
  1: {
    // A task that was created < 8.10 will go through this "up" migration
    // to ensure it matches the v1 schema.
    up: (state: Record<string, unknown>) => ({
      has_errors: state.has_errors || false,
      error_messages: state.error_messages || undefined,
      runs: state.runs || 0,
      count_total: state.count_total || 0,
      count_by_type: state.count_by_type || {},
      throttle_time: state.throttle_time || {
        min: '0s',
        avg: '0s',
        max: '0s',
      },
      schedule_time: state.schedule_time || {
        min: '0s',
        avg: '0s',
        max: '0s',
      },
      throttle_time_number_s: state.throttle_time_number_s || {
        min: 0,
        avg: 0,
        max: 0,
      },
      schedule_time_number_s: state.schedule_time_number_s || {
        min: 0,
        avg: 0,
        max: 0,
      },
      connectors_per_alert: state.connectors_per_alert || {
        min: 0,
        avg: 0,
        max: 0,
      },
      count_active_by_type: state.count_active_by_type || {},
      count_active_total: state.count_active_total || 0,
      count_disabled_total: state.count_disabled_total || 0,
      count_rules_by_execution_status: state.count_rules_by_execution_status || {
        success: 0,
        error: 0,
        warning: 0,
      },
      count_rules_with_tags: state.count_rules_with_tags || 0,
      count_rules_by_notify_when: state.count_rules_by_notify_when || {
        on_action_group_change: 0,
        on_active_alert: 0,
        on_throttle_interval: 0,
      },
      count_rules_snoozed: state.count_rules_snoozed || 0,
      count_rules_muted: state.count_rules_muted || 0,
      count_rules_with_muted_alerts: state.count_rules_with_muted_alerts || 0,
      count_connector_types_by_consumers: state.count_connector_types_by_consumers || {},
      count_rules_namespaces: state.count_rules_namespaces || 0,
      count_rules_executions_per_day: state.count_rules_executions_per_day || 0,
      count_rules_executions_by_type_per_day: state.count_rules_executions_by_type_per_day || {},
      count_rules_executions_failured_per_day: state.count_rules_executions_failured_per_day || 0,
      count_rules_executions_failured_by_reason_per_day:
        state.count_rules_executions_failured_by_reason_per_day || {},
      count_rules_executions_failured_by_reason_by_type_per_day:
        state.count_rules_executions_failured_by_reason_by_type_per_day || {},
      count_rules_by_execution_status_per_day: state.count_rules_by_execution_status_per_day || {},
      count_rules_executions_timeouts_per_day: state.count_rules_executions_timeouts_per_day || 0,
      count_rules_executions_timeouts_by_type_per_day:
        state.count_rules_executions_timeouts_by_type_per_day || {},
      count_failed_and_unrecognized_rule_tasks_per_day:
        state.count_failed_and_unrecognized_rule_tasks_per_day || 0,
      count_failed_and_unrecognized_rule_tasks_by_status_per_day:
        state.count_failed_and_unrecognized_rule_tasks_by_status_per_day || {},
      count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day:
        state.count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day || {},
      avg_execution_time_per_day: state.avg_execution_time_per_day || 0,
      avg_execution_time_by_type_per_day: state.avg_execution_time_by_type_per_day || {},
      avg_es_search_duration_per_day: state.avg_es_search_duration_per_day || 0,
      avg_es_search_duration_by_type_per_day: state.avg_es_search_duration_by_type_per_day || {},
      avg_total_search_duration_per_day: state.avg_total_search_duration_per_day || 0,
      avg_total_search_duration_by_type_per_day:
        state.avg_total_search_duration_by_type_per_day || {},
      percentile_num_generated_actions_per_day:
        state.percentile_num_generated_actions_per_day || {},
      percentile_num_generated_actions_by_type_per_day:
        state.percentile_num_generated_actions_by_type_per_day || {},
      percentile_num_alerts_per_day: state.percentile_num_alerts_per_day || {},
      percentile_num_alerts_by_type_per_day: state.percentile_num_alerts_by_type_per_day || {},
    }),
    schema: stateSchemaV1,
  },
  2: {
    up: (state: Record<string, unknown>) => ({
      ...stateSchemaByVersion[1].up(state),
      count_mw_total: state.count_mw_total || 0,
      count_mw_with_repeat_toggle_on: state.count_mw_with_repeat_toggle_on || 0,
      count_mw_with_filter_alert_toggle_on: state.count_mw_with_filter_alert_toggle_on || 0,
      count_alerts_total: state.count_alerts_total || 0,
      count_alerts_by_rule_type: state.count_alerts_by_rule_type || {},
    }),
    schema: stateSchemaV2,
  },
  3: {
    up: (state: Record<string, unknown>) => ({
      ...stateSchemaByVersion[2].up(state),
      count_rules_with_linked_dashboards: state.count_rules_with_linked_dashboards || 0,
      count_rules_with_investigation_guide: state.count_rules_with_investigation_guide || 0,
    }),
    schema: stateSchemaV3,
  },
  4: {
    up: (state: Record<string, unknown>) => ({
      ...stateSchemaByVersion[3].up(state),
      count_rules_snoozed_by_type: state.count_rules_snoozed_by_type || {},
      count_rules_muted_by_type: state.count_rules_muted_by_type || {},
    }),
    schema: stateSchemaV4,
  },
  5: {
    up: (state: Record<string, unknown>) => ({
      ...stateSchemaByVersion[4].up(state),
      count_ignored_fields_by_rule_type: state.count_ignored_fields_by_rule_type || {},
    }),
    schema: stateSchemaV5,
  },
  6: {
    up: (state: Record<string, unknown>) => ({
      ...stateSchemaByVersion[5].up(state),
      count_backfill_executions: state.count_backfill_executions || 0,
      count_backfills_by_execution_status_per_day:
        state.count_backfills_by_execution_status_per_day || {},
      count_gaps: state.count_gaps || 0,
      total_unfilled_gap_duration_ms: state.total_unfilled_gap_duration_ms || 0,
      total_filled_gap_duration_ms: state.total_filled_gap_duration_ms || 0,
    }),
    schema: stateSchemaV6,
  },
  7: {
    up: (state: Record<string, unknown>) => ({
      ...stateSchemaByVersion[6].up(state),
      count_rules_with_api_key_created_by_user: state.count_rules_with_api_key_created_by_user || 0,
    }),
    schema: stateSchemaV7,
  },
  8: {
    up: (state: Record<string, unknown>) => ({
      ...stateSchemaByVersion[7].up(state),
      count_rules_with_elasticagent_tag: state.count_rules_with_elasticagent_tag || 0,
      count_rules_with_elasticagent_tag_by_type:
        state.count_rules_with_elasticagent_tag_by_type || {},
    }),
    schema: stateSchemaV8,
  },
};

const latestTaskStateSchema = stateSchemaByVersion[8].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  has_errors: false,
  error_messages: undefined,
  runs: 0,
  count_total: 0,
  count_by_type: {},
  throttle_time: {
    min: '0s',
    avg: '0s',
    max: '0s',
  },
  schedule_time: {
    min: '0s',
    avg: '0s',
    max: '0s',
  },
  throttle_time_number_s: {
    min: 0,
    avg: 0,
    max: 0,
  },
  schedule_time_number_s: {
    min: 0,
    avg: 0,
    max: 0,
  },
  connectors_per_alert: {
    min: 0,
    avg: 0,
    max: 0,
  },
  count_active_by_type: {},
  count_active_total: 0,
  count_disabled_total: 0,
  count_rules_by_execution_status: {
    success: 0,
    error: 0,
    warning: 0,
  },
  count_rules_with_tags: 0,
  count_rules_with_elasticagent_tag: 0,
  count_rules_with_elasticagent_tag_by_type: {},
  count_rules_by_notify_when: {
    on_action_group_change: 0,
    on_active_alert: 0,
    on_throttle_interval: 0,
  },
  count_rules_snoozed: 0,
  count_rules_muted: 0,
  count_rules_snoozed_by_type: {},
  count_rules_muted_by_type: {},
  count_mw_total: 0,
  count_mw_with_repeat_toggle_on: 0,
  count_mw_with_filter_alert_toggle_on: 0,
  count_rules_with_muted_alerts: 0,
  count_connector_types_by_consumers: {},
  count_rules_namespaces: 0,
  count_rules_executions_per_day: 0,
  count_rules_executions_by_type_per_day: {},
  count_rules_executions_failured_per_day: 0,
  count_rules_executions_failured_by_reason_per_day: {},
  count_rules_executions_failured_by_reason_by_type_per_day: {},
  count_rules_by_execution_status_per_day: {},
  count_rules_executions_timeouts_per_day: 0,
  count_rules_executions_timeouts_by_type_per_day: {},
  count_failed_and_unrecognized_rule_tasks_per_day: 0,
  count_failed_and_unrecognized_rule_tasks_by_status_per_day: {},
  count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {},
  avg_execution_time_per_day: 0,
  avg_execution_time_by_type_per_day: {},
  avg_es_search_duration_per_day: 0,
  avg_es_search_duration_by_type_per_day: {},
  avg_total_search_duration_per_day: 0,
  avg_total_search_duration_by_type_per_day: {},
  percentile_num_generated_actions_per_day: {},
  percentile_num_generated_actions_by_type_per_day: {},
  percentile_num_alerts_per_day: {},
  percentile_num_alerts_by_type_per_day: {},
  count_alerts_total: 0,
  count_alerts_by_rule_type: {},
  count_backfill_executions: 0,
  count_backfills_by_execution_status_per_day: {},
  count_gaps: 0,
  total_unfilled_gap_duration_ms: 0,
  total_filled_gap_duration_ms: 0,
  count_ignored_fields_by_rule_type: {},
  count_rules_with_linked_dashboards: 0,
  count_rules_with_investigation_guide: 0,
  count_rules_with_api_key_created_by_user: 0,
};
