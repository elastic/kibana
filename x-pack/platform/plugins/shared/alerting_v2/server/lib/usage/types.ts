/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DispatchFailureReason,
  GroupingMode,
  ThrottleStrategy,
} from '@kbn/alerting-v2-schemas';
import type { ActionPolicyEventAction } from '../dispatcher/steps/constants';

export interface NameValuePair {
  name: string;
  value: number;
}

/** Mutually exclusive: `disabled` = not enabled; `snoozed` = enabled and snoozed; `enabled` otherwise. */
export type ActionPolicyStatus = 'enabled' | 'disabled' | 'snoozed';

/**
 * What a policy did in the window. `failing` = at least one `dispatch_failed` event;
 * `broken` = failing and zero `dispatched` events. Not mutually exclusive.
 */
export type DispatcherPolicyActivity = 'dispatched' | 'throttled' | 'failing' | 'broken';

/** p50 / p99 / avg of a per-policy distribution; `null` when there are no policies. */
export interface Distribution {
  p50: number | null;
  p99: number | null;
  avg: number | null;
}

/**
 * Usage type for telemetry usage collector.
 */
export interface AlertingV2Usage {
  has_errors: boolean;
  error_messages?: string[];

  // rule stats
  count_total?: number;
  count_enabled?: number;
  count_by_kind?: { alert?: number; signal?: number };
  count_by_schedule?: NameValuePair[];
  count_by_lookback?: NameValuePair[];
  avg_pending_count?: number | null;
  avg_recovering_count?: number | null;
  count_by_pending_timeframe?: NameValuePair[];
  count_by_recovering_timeframe?: NameValuePair[];
  count_with_grouping?: number;
  avg_grouping_fields_count?: number | null;
  min_created_at?: string | null;
  count_by_recovery_strategy?: {
    no_breach?: number;
    condition?: number;
    query?: number;
    manual?: number;
  };
  count_by_no_data_strategy?: {
    ignore?: number;
    keep_last?: number;
    resolve?: number;
    alert?: number;
  };

  // execution stats
  executions_count_24hr?: number;
  executions_count_by_status_24hr?: { success?: number; failure?: number; unknown?: number };
  executions_delay_p50_ms?: number | null;
  executions_delay_p75_ms?: number | null;
  executions_delay_p95_ms?: number | null;
  executions_delay_p99_ms?: number | null;
  dispatcher_executions_count_24hr?: number;

  // action policy stats
  action_policies_count?: number;
  action_policies_unique_workflow_count?: number;
  action_policies_count_with_matcher?: number;
  action_policies_count_with_group_by?: number;
  action_policies_avg_group_by_fields_count?: number | null;
  action_policies_count_by_throttle_interval?: NameValuePair[];
  action_policies_count_by_status?: { enabled?: number; disabled?: number; snoozed?: number };
  action_policies_count_by_grouping_mode?: { per_alert?: number; per_field?: number; all?: number };
  action_policies_count_by_throttle_strategy?: {
    on_status_change?: number;
    per_status_interval?: number;
    time_interval?: number;
    every_time?: number;
    none?: number;
  };
  action_policies_workflows_per_policy?: Distribution;
  action_policies_count_with_multiple_workflows?: number;

  // dispatcher activity stats (event log, last 24h)
  dispatcher_alerts_count_by_outcome_24hr?: {
    dispatched?: number;
    throttled?: number;
    unmatched?: number;
  };
  dispatcher_action_groups_count_by_outcome_24hr?: { dispatched?: number; throttled?: number };
  dispatcher_unique_alerts_dispatched_count_24hr?: number;
  dispatcher_workflow_executions_count_24hr?: number;
  dispatcher_unique_workflows_triggered_count_24hr?: number;
  dispatcher_notifying_executions_count_24hr?: number;
  dispatcher_notifying_spaces_count_24hr?: number;
  dispatcher_policies_count_by_activity_24hr?: {
    dispatched?: number;
    throttled?: number;
    failing?: number;
    broken?: number;
  };
  dispatcher_action_groups_dispatched_per_policy_24hr?: Distribution;
  dispatcher_alerts_dispatched_per_policy_24hr?: Distribution;
  dispatcher_workflow_executions_per_policy_24hr?: Distribution;
  dispatcher_throttle_ratio_per_policy_24hr?: Distribution;
  dispatcher_uncovered_rules_count_24hr?: number;
  dispatcher_dispatch_failures_count_by_reason_24hr?: {
    missing_api_key?: number;
    workflow_not_found?: number;
    workflow_disabled?: number;
    schedule_error?: number;
    license_not_supported?: number;
  };

  // alert event stats
  alerts_count?: number;
  alerts_count_by_kind?: { breached?: number; recovered?: number; no_data?: number };
  alerts_count_by_source?: NameValuePair[];
  alerts_count_by_type?: { signal?: number; alert?: number };
  alerts_episode_count?: number;
  alerts_min_timestamp?: string | null;
  alerts_index_size_bytes?: number | null;
}

export type AlertingV2UsageCollectorSchemaType = AlertingV2Usage & {
  available: boolean;
  enabled: boolean;
};

/**
 * The telemetry schema parser (`scripts/telemetry_check`) walks the usage type statically and cannot
 * follow types inferred from zod, so the `count_by_*` keys above are written by hand. These checks
 * fail to compile when an enum gains a value the keys do not cover; `MakeSchemaFrom` then requires
 * the new key in the collector schema too.
 */
type AssertCovered<Enum extends Keys, Keys> = Enum;
export type ActionPolicyStatusKeysCheck = AssertCovered<
  ActionPolicyStatus,
  keyof NonNullable<AlertingV2Usage['action_policies_count_by_status']>
>;
export type GroupingModeKeysCheck = AssertCovered<
  GroupingMode,
  keyof NonNullable<AlertingV2Usage['action_policies_count_by_grouping_mode']>
>;
export type ThrottleStrategyKeysCheck = AssertCovered<
  ThrottleStrategy | 'none',
  keyof NonNullable<AlertingV2Usage['action_policies_count_by_throttle_strategy']>
>;
export type AlertsOutcomeKeysCheck = AssertCovered<
  Exclude<ActionPolicyEventAction, 'dispatch_failed'>,
  keyof NonNullable<AlertingV2Usage['dispatcher_alerts_count_by_outcome_24hr']>
>;
export type ActionGroupsOutcomeKeysCheck = AssertCovered<
  Exclude<ActionPolicyEventAction, 'dispatch_failed' | 'unmatched'>,
  keyof NonNullable<AlertingV2Usage['dispatcher_action_groups_count_by_outcome_24hr']>
>;
export type PolicyActivityKeysCheck = AssertCovered<
  DispatcherPolicyActivity,
  keyof NonNullable<AlertingV2Usage['dispatcher_policies_count_by_activity_24hr']>
>;
export type DispatchFailureReasonKeysCheck = AssertCovered<
  DispatchFailureReason,
  keyof NonNullable<AlertingV2Usage['dispatcher_dispatch_failures_count_by_reason_24hr']>
>;
