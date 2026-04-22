/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleId = string;
export type NotificationPolicyId = string;
export type NotificationGroupId = string;
export type AlertEpisodeData = Record<string, unknown>;

export interface NotificationPolicyDestination {
  type: 'workflow';
  id: string;
}

export interface AlertEpisode {
  last_event_timestamp: string;
  rule_id: RuleId;
  group_hash: string;
  episode_id: string;
  episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
  data?: AlertEpisodeData;
}

export interface AlertEpisodeSuppression {
  rule_id: RuleId;
  group_hash: string;
  episode_id: string | null;
  should_suppress: boolean;
  last_ack_action?: string | null;
  last_deactivate_action?: string | null;
  last_snooze_action?: string | null;
}

export interface DispatcherExecutionParams {
  previousStartedAt?: Date;
  abortController?: AbortController;
}

/**
 * Counts of entities present in the pipeline state after a given stage
 * completes. Keys are a stable subset of `DispatcherPipelineState` field names
 * and are always present (defaulting to 0) so downstream consumers (APM, logs,
 * ES|QL) can aggregate without special-casing per step or tolerating missing
 * fields.
 */
export type DispatcherStageCounts = Readonly<Record<DispatcherCountKey, number>>;

export type DispatcherCountKey =
  | 'episodes'
  | 'suppressions'
  | 'dispatchable'
  | 'suppressed'
  | 'rules'
  | 'policies'
  | 'matched'
  | 'groups'
  | 'dispatch'
  | 'throttled';

/**
 * Minimal, log-safe representation of an error thrown by a pipeline step.
 * We intentionally only keep the class name and message here — stack traces
 * are emitted separately at `error` level so the per-tick summary stays
 * compact and queryable.
 */
export interface DispatcherStageError {
  readonly type: string;
  readonly message: string;
}

export interface DispatcherStageTiming {
  readonly name: string;
  readonly duration_ms: number;
  readonly halted: boolean;
  readonly counts: DispatcherStageCounts;
  readonly error?: DispatcherStageError;
}

export interface DispatcherTickSummary {
  readonly started_at: string;
  readonly finished_at: string;
  readonly duration_ms: number;
  readonly previous_started_at: string;
  readonly completed: boolean;
  readonly halt_reason: DispatcherHaltReason | null;
  readonly stages: readonly DispatcherStageTiming[];
}

export interface DispatcherExecutionResult {
  startedAt: Date;
  tick: DispatcherTickSummary;
}

export interface DispatcherTaskState {
  previousStartedAt?: string;
}

export interface Rule {
  id: RuleId;
  spaceId: string;
  name: string;
  description: string;
  tags: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPolicy {
  id: NotificationPolicyId;
  spaceId: string;
  name: string;
  enabled: boolean;
  /** KQL expression evaluated against the alert episode context.
   *  An empty matcher matches all episodes (catch-all). */
  matcher?: string; // e.g. 'data.severity == "critical" AND data.env != "dev"'
  /** data.* fields used to group episodes into a single notification */
  groupBy: string[];
  /** User-defined tags for organizing and filtering policies */
  tags: string[];
  /** How episodes are grouped into notification payloads */
  groupingMode?: 'per_episode' | 'all' | 'per_field';
  /** Throttle configuration controlling notification frequency */
  throttle?: {
    strategy?: 'on_status_change' | 'per_status_interval' | 'time_interval' | 'every_time';
    interval?: string; // e.g. '1h', '30m', '5m'
  };
  snoozedUntil?: string | null;
  /** Target destinations to dispatch matched episodes to */
  destinations: NotificationPolicyDestination[];

  /** Decrypted base64-encoded API key (id:key) for authenticated workflow dispatch */
  apiKey?: string;
}

export interface MatchedPair {
  episode: AlertEpisode;
  policy: NotificationPolicy;
}

export interface NotificationGroup {
  id: NotificationGroupId;
  spaceId: string;
  policyId: NotificationPolicyId;
  destinations: NotificationPolicyDestination[];
  groupKey: Record<string, unknown>;
  episodes: AlertEpisode[];
}

export interface NotificationPolicyWorkflowPayload {
  id: NotificationGroupId;
  policyId: NotificationPolicyId;
  groupKey: Record<string, unknown>;
  episodes: AlertEpisode[];
}

export interface LastNotifiedRecord {
  notification_group_id: NotificationGroupId;
  last_notified: string;
  episode_status?: string;
}

export interface LastNotifiedInfo {
  lastNotified: Date;
  episodeStatus?: string;
}

export interface DispatcherPipelineInput {
  readonly startedAt: Date;
  readonly previousStartedAt: Date;
}

export interface DispatcherPipelineState {
  readonly input: DispatcherPipelineInput;
  readonly episodes?: AlertEpisode[];
  readonly suppressions?: AlertEpisodeSuppression[];
  readonly dispatchable?: AlertEpisode[];
  readonly suppressed?: Array<AlertEpisode & { reason: string }>;
  readonly rules?: Map<RuleId, Rule>;
  readonly policies?: Map<NotificationPolicyId, NotificationPolicy>;
  readonly matched?: MatchedPair[];
  readonly groups?: NotificationGroup[];
  readonly dispatch?: NotificationGroup[];
  readonly throttled?: NotificationGroup[];
}

/**
 * Controlled halt reasons a step may return from its own output when
 * there is nothing further to do. Expected, non-error outcomes.
 */
export type DispatcherStepHaltReason = 'no_episodes' | 'no_actions';

/**
 * Reasons a dispatcher tick stopped before completing all stages.
 *
 * Superset of `DispatcherStepHaltReason` plus `step_error`, which is
 * produced by the pipeline itself when it catches a thrown step.
 * `step_error` is intentionally NOT part of `DispatcherStepHaltReason`
 * so the type system prevents a step from accidentally returning it.
 */
export type DispatcherHaltReason = DispatcherStepHaltReason | 'step_error';

export type DispatcherStepOutput =
  | { type: 'continue'; data?: Partial<Omit<DispatcherPipelineState, 'input'>> }
  | { type: 'halt'; reason: DispatcherStepHaltReason };

export interface DispatcherStep {
  readonly name: string;
  execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput>;
}
