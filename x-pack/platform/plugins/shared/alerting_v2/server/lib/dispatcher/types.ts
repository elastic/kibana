/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleId = string;
export type NotificationPolicyId = string;
export type NotificationGroupId = string;

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

export interface DispatcherExecutionResult {
  startedAt: Date;
}

export interface DispatcherTaskState {
  previousStartedAt?: string;
}

export interface Rule {
  id: RuleId;
  name: string;
  description: string;
  notificationPolicyIds: NotificationPolicyId[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPolicy {
  id: NotificationPolicyId;
  name: string;
  /** KQL expression evaluated against the alert episode context.
   *  An empty matcher matches all episodes (catch-all). */
  matcher?: string; // e.g. 'data.severity == "critical" AND data.env != "dev"'
  /** data.* fields used to group episodes into a single notification */
  groupBy: string[];
  /** Minimum interval between notifications for the same group */
  throttle?: {
    interval?: string; // e.g. '1h', '30m', '5m'
  };
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
  ruleId: RuleId;
  policyId: NotificationPolicyId;
  destinations: NotificationPolicyDestination[];
  groupKey: Record<string, unknown>;
  episodes: AlertEpisode[];
}

export interface LastNotifiedRecord {
  notification_group_id: NotificationGroupId;
  last_notified: string;
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

export type DispatcherHaltReason = 'no_episodes' | 'no_actions';

export type DispatcherStepOutput =
  | { type: 'continue'; data?: Partial<Omit<DispatcherPipelineState, 'input'>> }
  | { type: 'halt'; reason: DispatcherHaltReason };

export interface DispatcherStep {
  readonly name: string;
  execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput>;
}
