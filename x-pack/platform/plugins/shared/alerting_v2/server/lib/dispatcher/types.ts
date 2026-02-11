/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleId = string;
export type NotificationPolicyId = string;
export type WorkflowId = string;
export type NotificationGroupId = string;

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
  /** CEL expression evaluated against the alert episode context.
   *  An empty string matches all episodes (catch-all). */
  matcher: string; // e.g. 'data.severity == "critical" && data.env != "dev"'
  /** data.* fields used to group episodes into a single notification */
  groupBy: string[];
  /** Minimum interval between notifications for the same group */
  throttle?: {
    interval?: string; // e.g. '1h', '30m', '5m'
  };
  /** Target workflow to dispatch matched episodes to */
  workflowId: WorkflowId;
}

export interface MatchedPair {
  episode: AlertEpisode;
  policy: NotificationPolicy;
}

export interface NotificationGroup {
  id: NotificationGroupId;
  ruleId: RuleId;
  policyId: NotificationPolicyId;
  workflowId: WorkflowId;
  groupKey: Record<string, unknown>;
  episodes: AlertEpisode[];
}

export interface LastNotifiedRecord {
  notification_group_id: NotificationGroupId;
  last_notified: string;
}
