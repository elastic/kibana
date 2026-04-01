/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Throttle-style suffix for repeat interval (matches API `30s`, `5m`, `2h`, `1d`). */
export type RepeatIntervalUnit = 's' | 'm' | 'h' | 'd';

/** Per-episode dispatch: align with notification timing (status vs evaluation). */
export interface EpisodeStatusChangeFrequency {
  type: 'episode_status_change';
}

export interface EpisodeStatusChangeRepeatFrequency {
  type: 'episode_status_change_repeat';
  repeatValue: number;
  repeatUnit: RepeatIntervalUnit;
}

export interface EpisodeEveryEvaluationFrequency {
  type: 'episode_every_evaluation';
}

/** Per-group dispatch: classic throttle vs every evaluation. */
export interface GroupImmediateFrequency {
  type: 'group_immediate';
}

export interface GroupThrottleFrequency {
  type: 'group_throttle';
  repeatValue: number;
  repeatUnit: RepeatIntervalUnit;
}

export type NotificationPolicyFrequency =
  | EpisodeStatusChangeFrequency
  | EpisodeStatusChangeRepeatFrequency
  | EpisodeEveryEvaluationFrequency
  | GroupImmediateFrequency
  | GroupThrottleFrequency;

export interface NotificationPolicyDestination {
  type: 'workflow';
  id: string;
}

export type DispatchPer = 'episode' | 'group';

export type SuppressionMechanismId = 'maintenance_window' | 'manual_suppressions';

export interface SuppressionMechanismItem {
  id: SuppressionMechanismId;
  enabled: boolean;
}

export interface NotificationPolicyFormState {
  name: string;
  description: string;
  matcher: string;
  groupBy: string[];
  dispatchPer: DispatchPer;
  frequency: NotificationPolicyFrequency;
  destinations: NotificationPolicyDestination[];
  suppressionMechanisms: SuppressionMechanismItem[];
}
