/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InvestigationSubjectType = 'significant_event' | 'alert';

export interface InvestigationSubject {
  type: InvestigationSubjectType;
  id: string;
}

export interface InvestigationContext {
  [key: string]: unknown;
}

/**
 * A point-in-time copy of the alert fields an investigation needs, taken by the caller at
 * trigger time. The investigation reads this instead of re-fetching the alert, so the run
 * reflects the alert as it looked when the trigger fired.
 *
 * Field sources are `kibana.alert.*`. Everything optional here is optional because the source
 * field is not guaranteed, not merely for convenience — see the notes on each.
 */
export interface AlertSnapshot {
  /** `kibana.alert.uuid` */
  id: string;
  /** `kibana.alert.rule.uuid` */
  rule_id: string;
  /** `kibana.alert.rule.name` */
  rule_name: string;
  /** `kibana.alert.rule.rule_type_id`, e.g. `apm.transaction_duration`. */
  rule_type_id: string;
  /** `kibana.alert.rule.category` — the rule type's display name, e.g. "Latency threshold". */
  rule_category: string;
  /** `kibana.alert.reason` — human-readable statement of why the alert fired. */
  reason: string;
  /** `kibana.alert.status` */
  status: string;
  /** `kibana.alert.start` */
  start: string;
  /** `kibana.alert.flapping` — written by the alerting framework for every alert. */
  flapping: boolean;
  /**
   * `kibana.alert.url`. Optional: the framework does not write this — individual rule types do,
   * and many observability rule types never set it.
   */
  url?: string;
  /** `kibana.alert.rule.tags` */
  rule_tags?: string[];
  /**
   * `kibana.alert.grouping` — nested entity grouping, e.g. `{ service: { name: 'checkout' } }`.
   * Optional: lives in the legacy experimental field map, which rule types opt into.
   */
  grouping?: Record<string, unknown>;
  /**
   * `kibana.alert.group` — the same grouping in flat form. Optional for the same reason as
   * `grouping`.
   */
  group?: AlertSnapshotGroup[];
  /** The rule condition that fired. Optional for the same reason as `grouping`. */
  evaluation?: AlertSnapshotEvaluation;
  /** `kibana.alert.rule.parameters` — raw, un-formatted rule params. */
  rule_parameters?: Record<string, unknown>;
  /**
   * `kibana.alert.index_pattern` — a starting point for ES|QL queries. Optional and usually
   * absent: only the infra metric-threshold, inventory-threshold and log-threshold rule types
   * populate it. Deriving it per rule type from `rule_parameters` is separate work.
   */
  index_pattern?: string;
}

export interface AlertSnapshotGroup {
  field: string;
  value: string;
}

export interface AlertSnapshotEvaluation {
  /**
   * The observed value, from `kibana.alert.evaluation.value` or, when the rule type writes the
   * plural field instead, `kibana.alert.evaluation.values`. Every type here is real:
   * `scaled_float` in the legacy experimental field map, a `keyword` holding a stringified
   * number for `.es-query`, and an array for the custom-threshold rule type, which writes one
   * entry per configured metric.
   */
  value?: number | string | Array<number | string>;
  /**
   * `kibana.alert.evaluation.threshold`. Scalar for most rule types, but an array for the
   * custom-threshold rule type, which writes one entry per criterion.
   */
  threshold?: number | number[];
}

/** Context shape required when `subject.type` is `alert`. */
export interface AlertInvestigationContext {
  alerts: AlertSnapshot[];
}

export interface StartInvestigationRequest {
  subject: InvestigationSubject;
  /**
   * Caller-supplied prompt for the investigation agent. Falls back to a generic
   * message derived from the subject when omitted.
   */
  message?: string;
  /**
   * Stream names the investigation should scope its signal search to.
   */
  stream_names?: string[];
  /**
   * Caller-supplied key for concurrency control. Passed to the workflow engine as
   * `concurrency_key`, which maps to `concurrencyGroupKey` in the execution index.
   * Two starts with the same key cancel-and-replace the in-flight run (cancel-in-progress
   * strategy). Use a stable, unique caller-side ID — e.g. the alert _id or event UUID.
   */
  concurrency_key?: string;
  context?: InvestigationContext | AlertInvestigationContext;
}

export interface StartInvestigationResponse {
  investigation_id: string;
}

export const INVESTIGATION_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export interface GetInvestigationResponse {
  investigation_id: string;
  subject: InvestigationSubject;
  status: InvestigationStatus;
  started_at?: string;
  completed_at?: string;
  conclusions?: string;
  error?: string;
}

export interface ListInvestigationsRequest {
  statuses?: InvestigationStatus[];
  started_after?: string;
  started_before?: string;
  finished_after?: string;
  finished_before?: string;
  sort_field?: 'created_at' | 'finished_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface ListInvestigationItem {
  investigation_id: string;
  status: InvestigationStatus;
  started_at?: string;
  completed_at?: string;
  concurrency_key?: string;
  executed_by?: string;
}

export interface ListInvestigationsResponse {
  results: ListInvestigationItem[];
  page: number;
  size: number;
  total: number;
}
