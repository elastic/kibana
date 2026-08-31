/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum Aggregation {
  COUNT = 'count',
  AVG = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  CARDINALITY = 'cardinality',
  P95 = 'p95',
  P99 = 'p99',
}

export enum Comparator {
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
}

export type ConditionOperator = 'AND' | 'OR';

/** Aggregations that operate on a field, so `field` is required for them. */
export const AGGREGATIONS_REQUIRING_FIELD: readonly Aggregation[] = [
  Aggregation.AVG,
  Aggregation.SUM,
  Aggregation.MIN,
  Aggregation.MAX,
  Aggregation.CARDINALITY,
  Aggregation.P95,
  Aggregation.P99,
] as const;

/**
 * One `STATS` aggregation. `label` is the ES|QL column the aggregation is
 * assigned to, and is what conditions and evaluations reference.
 */
export interface ThresholdStat {
  label: string;
  aggregation: Aggregation;
  field?: string;
  /** Inline `WHERE` applied to this aggregation only. */
  filter?: string;
}

/** A derived metric computed with `EVAL` from stat labels and other evaluations. */
export interface ThresholdEvaluation {
  label: string;
  expression: string;
}

/**
 * One comparison against a stat or evaluation label. `threshold` holds a single
 * bound for the simple comparators and two (lower, upper) for `between` /
 * `not_between`.
 */
export interface ThresholdCondition {
  metric: string;
  comparator: Comparator;
  threshold: number[];
}

export interface ThresholdRecovery {
  conditions: ThresholdCondition[];
  conditionOperator: ConditionOperator;
}

/**
 * Persisted shape of `metadata.builder_fields` for the `threshold` builder.
 *
 * Deliberately free of the client-side list keys the form uses: they are React
 * rendering concerns, and requiring them would force API callers to invent ids
 * that never affect the generated query.
 */
export interface ThresholdBuilderFields {
  indexPattern: string;
  timeField: string;
  /** Global `WHERE` applied before `STATS`. */
  filterQuery?: string;
  stats: ThresholdStat[];
  evaluations: ThresholdEvaluation[];
  alertConditions: ThresholdCondition[];
  conditionOperator: ConditionOperator;
  groupByFields: string[];
  recovery?: ThresholdRecovery;
}
