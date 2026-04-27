/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleId = string;
export type ActionPolicyId = string;
export type ActionGroupId = string;
export type AlertEpisodeData = Record<string, unknown>;

export interface ActionPolicyDestination {
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
  /**
   * Upper bound (exclusive after the first run) on `@timestamp` values
   * already processed by `fetch_episodes`. Drives the per-tick query
   * window together with `TICK_LOOKBACK_CAP_MINUTES` and
   * `SETTLE_BUFFER_SECONDS`. When undefined, the dispatcher cold-starts
   * from `now − LOOKBACK_WINDOW_MINUTES`.
   */
  eventWatermark?: Date;
  abortController?: AbortController;
}

export interface DispatcherExecutionResult {
  startedAt: Date;
  /**
   * Watermark to persist for the next tick. Set when the pipeline returned
   * (i.e. completed or halted on a controlled `no_episodes` / `no_actions`
   * reason); undefined when the pipeline was unable to bound a window.
   * If the pipeline throws, `dispatcher.run` rethrows and `task_runner`
   * never gets a result, so the watermark naturally stays unchanged.
   */
  nextEventWatermark?: string;
}

export interface DispatcherTaskState {
  previousStartedAt?: string;
  eventWatermark?: string;
  // Task Manager persists state as `Record<string, unknown>`; the index
  // signature keeps assignment in both directions safe without per-call casts.
  [key: string]: unknown;
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

export interface ActionPolicy {
  id: ActionPolicyId;
  spaceId: string;
  name: string;
  enabled: boolean;
  /** KQL expression evaluated against the alert episode context.
   *  An empty matcher matches all episodes (catch-all). */
  matcher?: string; // e.g. 'data.severity == "critical" AND data.env != "dev"'
  /** data.* fields used to group episodes into a single action group */
  groupBy: string[];
  /** User-defined tags for organizing and filtering policies */
  tags: string[];
  /** How episodes are grouped into action group payloads */
  groupingMode?: 'per_episode' | 'all' | 'per_field';
  /** Throttle configuration controlling action frequency */
  throttle?: {
    strategy?: 'on_status_change' | 'per_status_interval' | 'time_interval' | 'every_time';
    interval?: string; // e.g. '1h', '30m', '5m'
  };
  snoozedUntil?: string | null;
  /** Target destinations to dispatch matched episodes to */
  destinations: ActionPolicyDestination[];

  /** Decrypted base64-encoded API key (id:key) for authenticated workflow dispatch */
  apiKey?: string;
}

export interface MatchedPair {
  episode: AlertEpisode;
  policy: ActionPolicy;
}

export interface ActionGroup {
  id: ActionGroupId;
  spaceId: string;
  policyId: ActionPolicyId;
  destinations: ActionPolicyDestination[];
  groupKey: Record<string, unknown>;
  episodes: AlertEpisode[];
}

export interface ActionPolicyWorkflowPayload {
  id: ActionGroupId;
  policyId: ActionPolicyId;
  groupKey: Record<string, unknown>;
  episodes: AlertEpisode[];
}

export interface LastNotifiedRecord {
  action_group_id: ActionGroupId;
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
  readonly eventWatermark?: Date;
}

export interface DispatcherPipelineState {
  readonly input: DispatcherPipelineInput;
  readonly episodes?: AlertEpisode[];
  readonly suppressions?: AlertEpisodeSuppression[];
  readonly dispatchable?: AlertEpisode[];
  readonly suppressed?: Array<AlertEpisode & { reason: string }>;
  readonly rules?: Map<RuleId, Rule>;
  readonly policies?: Map<ActionPolicyId, ActionPolicy>;
  readonly matched?: MatchedPair[];
  readonly groups?: ActionGroup[];
  readonly dispatch?: ActionGroup[];
  readonly throttled?: ActionGroup[];
  /**
   * Proposed watermark for the next tick. Written by `fetch_episodes`
   * once it has bounded its query window; left unset when `fetch_episodes`
   * elects not to query (e.g. settle buffer collapses the window).
   */
  readonly nextEventWatermark?: string;
}

export type DispatcherHaltReason = 'no_episodes' | 'no_actions';

export type DispatcherStepOutput =
  | { type: 'continue'; data?: Partial<Omit<DispatcherPipelineState, 'input'>> }
  | {
      type: 'halt';
      reason: DispatcherHaltReason;
      /**
       * Optional state update applied even though the step is halting.
       * Used by `fetch_episodes` to publish `nextEventWatermark` when it
       * successfully queried an empty window — the tick is "done" for
       * that interval and the watermark must still advance.
       */
      data?: Partial<Omit<DispatcherPipelineState, 'input'>>;
    };

export interface DispatcherStep {
  readonly name: string;
  execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput>;
}
