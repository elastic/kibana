/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyGrouping, AlertEventSeverity } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeStatus } from '../../resources/datastreams/alert_events';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import type {
  DispatchOutcome,
  DispatchPlan,
  AlertScan,
  AlertTriage,
  PolicyCatalog,
  RuleCatalog,
  SuppressionIndex,
} from './state';
import type { DispatchFailureReason } from './steps/constants';

export type RuleId = string;
export type ActionPolicyId = string;
export type ActionGroupId = string;
export type AlertData = Record<string, unknown>;

export interface ActionPolicyDestination {
  type: 'workflow';
  id: string;
}

export interface Alert {
  last_event_timestamp: string;
  rule_id: RuleId | null;
  source: string;
  space_id: string;
  group_hash: string;
  alert_id: string;
  alert_status: AlertEpisodeStatus;
  severity?: AlertEventSeverity;
  data?: AlertData;
}

/** Suppression fact read from `.alert-actions`; a null `alert_id` means series-scoped. */
export interface SuppressionRow {
  rule_id: RuleId | null;
  source: string | null;
  space_id: string | null;
  group_hash: string;
  alert_id: string | null;
  should_suppress: boolean;
  last_ack_action?: string | null;
  last_deactivate_action?: string | null;
  last_snooze_action?: string | null;
}

/** Row of the alert suppressions query: ack and deactivate state of one alert. */
export type AlertSuppressionRow = Omit<SuppressionRow, 'alert_id' | 'last_snooze_action'> & {
  alert_id: string;
};

/** Row of the series suppressions query: snooze state of a series, so it carries no `alert_id`. */
export type SeriesSuppressionRow = Omit<
  SuppressionRow,
  'alert_id' | 'last_ack_action' | 'last_deactivate_action'
>;

export interface DispatcherExecutionParams {
  eventWatermark?: Date;
  /** Current count of consecutive ticks in which the watermark did not advance. */
  stuckTicks?: number;
  signal?: AbortSignal;
  taskId: string;
}

export interface DispatcherExecutionResult {
  startedAt: Date;
  nextWatermark: Date;
  /** Updated stuck-tick counter (reset to 0 on advance, incremented otherwise). */
  nextStuckTicks: number;
  pipelineResult: DispatcherPipelineResult;
}

export interface DispatcherTaskState {
  eventWatermark?: string;
  stuckTicks?: number;
}

export interface DispatcherPipelineResult {
  readonly completed: boolean;
  readonly haltReason?: DispatcherHaltReason;
  readonly finalState: DispatcherPipelineState;
}

export interface Rule {
  id: RuleId;
  spaceId: string;
  name: string;
  routingTags: string[];
}

export interface PolicyMatcherAttributes {
  tags?: string[] | null;
  expression?: string | null;
}

export interface ActionPolicy {
  id: ActionPolicyId;
  spaceId: string;
  name: string;
  enabled: boolean;
  /** Structured matcher evaluated against the alert context.
   *  Null or absent means catch-all (matches every alert). */
  matcher?: PolicyMatcherAttributes | null;
  /**
   * How alerts are batched into action group payloads. The mode decides whether `data.*` fields
   * come with it. Defaulted at hydration (DEFAULT_GROUPING).
   */
  grouping: ActionPolicyGrouping;
  /** Throttle configuration controlling action frequency */
  throttle?: {
    strategy?: 'on_status_change' | 'per_status_interval' | 'time_interval' | 'every_time';
    interval?: string | null; // e.g. '1h', '30m', '5m'; null for intervalless strategies
  };
  snoozedUntil?: string | null;
  /** Target destinations to dispatch matched alerts to */
  destinations: ActionPolicyDestination[];
  /** Decrypted base64-encoded API key (id:key) for authenticated workflow dispatch */
  apiKey?: string;
}

export interface MatchedPair {
  alert: Alert;
  policy: ActionPolicy;
}

export interface ActionGroup {
  id: ActionGroupId;
  spaceId: string;
  policyId: ActionPolicyId;
  destinations: ActionPolicyDestination[];
  groupKey: Record<string, unknown>;
  alerts: Alert[];
  rules: Record<RuleId, ActionPolicyWorkflowPayloadRule>;
}

export type ActionPolicyWorkflowPayloadRule = Pick<Rule, 'name'>;

export type ActionPolicyWorkflowPayloadAlert = Alert;

export interface ActionPolicyWorkflowPayload {
  id: ActionGroupId;
  policyId: ActionPolicyId;
  groupKey: Record<string, unknown>;
  alerts: ActionPolicyWorkflowPayloadAlert[];
  rules: Record<RuleId, ActionPolicyWorkflowPayloadRule>;
}

export interface LastNotifiedRecord {
  action_group_id: ActionGroupId;
  last_notified: string;
  alert_status?: string;
}

export interface LastNotifiedInfo {
  lastNotified: Date;
  alertStatus?: string;
}

/**
 * A single failed attempt to dispatch one action group to one workflow
 * destination. Carries everything the execution-history step needs to emit a
 * `dispatch_failed` event: the parent policy, the failing group + workflow, the
 * affected alerts, and a machine-readable + human-readable cause.
 */
export interface DispatchFailure {
  policyId: ActionPolicyId;
  spaceId: string;
  actionGroupId: ActionGroupId;
  workflowId: string;
  alerts: Alert[];
  reason: DispatchFailureReason;
  message: string;
}

export interface DispatcherPipelineInput {
  readonly startedAt: Date;
  readonly eventWatermark: Date;
  /** Lower bound of the event-row scan window. Equal to `eventWatermark − OVERLAP_WINDOW_MINUTES`. Action rows are not window-capped. */
  readonly windowStart: Date;
  /** Upper bound of the event-row scan window. Equal to `min(windowStart + MAX_WINDOW_MINUTES, startedAt − SETTLE_BUFFER_SECONDS)`. Action rows are not window-capped. */
  readonly windowEnd: Date;
  readonly executionUuid: string;
  readonly signal: AbortSignal;
}

export interface DispatcherPipelineState {
  readonly input: DispatcherPipelineInput;
  /** Result of the windowed candidate scan (alerts + truncation flag). */
  readonly scan?: AlertScan;
  /** Count of alerts that received an `.alert-actions` record this tick. */
  readonly recordedAlerts?: number;
  /** Suppression facts from `.alert-actions`, indexed for per-alert lookup. */
  readonly suppressions?: SuppressionIndex;
  /** Dispatchable vs suppressed verdict on the scanned alerts. */
  readonly triage?: AlertTriage;
  readonly rules?: RuleCatalog;
  readonly policies?: PolicyCatalog;
  readonly matched?: MatchedPair[];
  readonly groups?: ActionGroup[];
  /** Delivery decision: groups eligible to dispatch now vs groups held back. */
  readonly plan?: DispatchPlan;
  /** Dispatch results: workflow executions per group and failed attempts. */
  readonly outcome?: DispatchOutcome;
}

export type DispatcherHaltReason =
  | 'no_alerts'
  | 'no_actions'
  | 'aborted'
  | 'inline_stats_too_large';

export type DispatcherStepOutput =
  | { type: 'continue'; data?: Partial<Omit<DispatcherPipelineState, 'input'>> }
  | { type: 'halt'; reason: DispatcherHaltReason };

export interface DispatcherStep {
  readonly name: string;
  execute(
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput>;
}
