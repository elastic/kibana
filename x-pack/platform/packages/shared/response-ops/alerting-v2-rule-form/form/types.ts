/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Import and re-export RuleKind and RecoveryPolicyType from schema
import type { RuleKind, RecoveryPolicyType } from '@kbn/alerting-v2-schemas';

/** Alert / recovery delay segment control (matches `AlertDelayField` / `RecoveryDelayField`). */
export type StateTransitionDelayMode = 'immediate' | 'breaches' | 'duration';

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
export interface RuleEvaluation {
  query: {
    base: string;
  };
}

export interface RuleGrouping {
  fields: string[];
}

export interface RecoveryPolicy {
  type: RecoveryPolicyType;
  query?: {
    base?: string | null;
  };
}

export interface RuleArtifact {
  id: string;
  type: string;
  value: string;
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
  evaluation: RuleEvaluation;
  grouping?: RuleGrouping;
  recoveryPolicy?: RecoveryPolicy;
  stateTransition?: StateTransition;
  stateTransitionAlertDelayMode: StateTransitionDelayMode;
  stateTransitionRecoveryDelayMode: StateTransitionDelayMode;
  artifacts?: RuleArtifact[];
}
