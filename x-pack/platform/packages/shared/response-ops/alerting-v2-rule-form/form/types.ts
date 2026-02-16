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
}
