/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Import and re-export RuleKind and RecoveryPolicyType from schema
import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { ActionFormValue } from '../actions_form';

/** Alert / recovery delay segment control (matches `AlertDelayField` / `RecoveryDelayField`). */
export const DELAY_MODE = {
  immediate: 'immediate',
  breaches: 'breaches',
  recoveries: 'recoveries',
  duration: 'duration',
} as const;

export type StateTransitionDelayMode = (typeof DELAY_MODE)[keyof typeof DELAY_MODE];

/**
 * Rule metadata containing identification and categorization info.
 */
export interface RuleMetadata {
  name: string;
  enabled: boolean;
  description?: string;
  owner?: string;
  tags?: string[];
}

export interface RuleSchedule {
  every: string;
  lookback: string;
}

/**
 * The form represents the rule's detection query in the API's `standalone`
 * format. `breach` is required; `recover` is optional and set by the compose
 * discover flow when the user configures a custom recovery condition.
 */
export interface RuleQuery {
  breach: string;
  recover?: string;
}

export interface RuleGrouping {
  fields: string[];
}

export interface RuleArtifact {
  id: string;
  type: string;
  value: string;
}

export interface RuleNotificationsValue {
  workflows: ActionFormValue;
}

/**
 * State transition configuration for alert-type rules.
 */
export interface StateTransition {
  pendingCount?: number | null;
  pendingTimeframe?: string | null;
  recoveringCount?: number | null;
  recoveringTimeframe?: string | null;
}

/**
 * Form values for creating a new alerting rule.
 * This interface defines the contract for the rule creation form,
 * independent of the API schema to allow for controlled evolution.
 */
export interface FormValues {
  kind: RuleKind;
  metadata: RuleMetadata;
  timeField: string;
  schedule: RuleSchedule;
  query: RuleQuery;
  grouping?: RuleGrouping;
  stateTransition?: StateTransition;
  stateTransitionAlertDelayMode: StateTransitionDelayMode;
  stateTransitionRecoveryDelayMode: StateTransitionDelayMode;
  artifacts?: RuleArtifact[];
  notifications?: RuleNotificationsValue;
  runbookArtifacts?: RuleArtifact[];
  dashboardArtifacts?: RuleArtifact[];
}
