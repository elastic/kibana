/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Import and re-export RuleKind and RecoveryPolicyType from schema
import type { RuleKind, RecoveryPolicyType } from '@kbn/alerting-v2-schemas';

/** Alert / recovery delay segment control (matches `AlertDelayField` / `RecoveryDelayField`). */
export type StateTransitionDelayMode = 'immediate' | 'breaches' | 'recoveries' | 'duration';

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

/** Aggregation options for the threshold alert builder stats UI. */
export type ThresholdAggregation =
  | 'avg'
  | 'max'
  | 'min'
  | 'sum'
  | 'p95'
  | 'p99'
  | 'count'
  | 'cardinality';

/** One computed statistic row in the threshold alert builder. */
export interface ThresholdStatRow {
  label: string;
  aggregation: ThresholdAggregation;
  field: string;
}

/** Comparison operators for threshold alert rule conditions (maps to ES|QL). */
export type ThresholdConditionOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';

/** One row in the threshold alert “Alert condition” UI. */
export interface ThresholdConditionRow {
  /** Matches a stat row label; the STATS column alias is derived the same way as in the query. */
  statLabel: string;
  operator: ThresholdConditionOperator;
  value: string;
}

/** How multiple threshold conditions are combined in the generated `WHERE` clause. */
export type ThresholdConditionCombinator = 'and' | 'or';

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
  /**
   * Threshold alert builder only: stat definitions used to generate the evaluation ES|QL query.
   * Not sent to the API — persisted via `evaluation.query.base`.
   */
  thresholdStats?: ThresholdStatRow[];
  /**
   * Threshold alert builder only: ES|QL `FROM` source (index pattern or data stream name).
   * Not sent to the API — persisted via `evaluation.query.base`.
   */
  thresholdDataSource?: string;
  /**
   * Threshold alert builder only: combine multiple conditions with AND or OR in `WHERE`.
   * Not sent to the API — persisted via `evaluation.query.base`.
   */
  thresholdConditionCombinator?: ThresholdConditionCombinator;
  /**
   * Threshold alert builder only: alert conditions referencing STATS column labels.
   * Not sent to the API — persisted via `evaluation.query.base`.
   */
  thresholdConditions?: ThresholdConditionRow[];
}
