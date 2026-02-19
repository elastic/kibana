/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rule kind - determines the behavior of the rule.
 * - 'alert': Creates alerts with state transitions (pending → active → recovering → inactive)
 * - 'signal': Creates signals without state management
 */
export type RuleKind = 'alert' | 'signal';

/**
 * Rule metadata containing identification and categorization info.
 */
export interface RuleMetadata {
  name: string;
  enabled: boolean;
  description?: string;
  owner?: string;
  labels?: string[];
}

export interface RuleSchedule {
  every: string;
  lookback: string;
}

export interface EvaluationQuery {
  base: string;
}

export interface RuleEvaluation {
  query: EvaluationQuery;
}

export interface RuleGrouping {
  fields: string[];
}

/**
 * Recovery policy type - determines how recovery is detected.
 * - 'query': Uses a custom ES|QL query to detect recovery
 * - 'no_breach': Recovers when the alert condition is no longer breached
 */
export type RecoveryPolicyType = 'query' | 'no_breach';

/**
 * Recovery policy configuration that determines how alerts recover.
 */
export interface RecoveryPolicy {
  /** Recovery detection type */
  type: RecoveryPolicyType;
  /** ES|QL query for recovery detection (when type is 'query') */
  query?: string;
}

/**
 * No data behavior - determines what happens when no data is received.
 * - 'no_data': Alert transitions to a "no data" state
 * - 'last_status': Alert maintains its last known status
 * - 'recover': Alert automatically recovers
 */
export type NoDataBehavior = 'no_data' | 'last_status' | 'recover';

/**
 * No data configuration that determines how the rule handles missing data.
 */
export interface NoDataConfig {
  /** Behavior when no data is detected */
  behavior: NoDataBehavior;
  /** Time window after which no data is detected (e.g., "5m", "1h") */
  timeframe: string;
  /** ES|QL query for no data detection */
  query: string;
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
  noData?: NoDataConfig;
}
