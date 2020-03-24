/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const RuleTypeSchema = t.keyof({
  query: null,
  saved_query: null,
  machine_learning: null,
});
export type RuleType = t.TypeOf<typeof RuleTypeSchema>;

export const NewRuleSchema = t.intersection([
  t.type({
    description: t.string,
    enabled: t.boolean,
    interval: t.string,
    name: t.string,
    risk_score: t.number,
    severity: t.string,
    type: RuleTypeSchema,
  }),
  t.partial({
    anomaly_threshold: t.number,
    created_by: t.string,
    false_positives: t.array(t.string),
    filters: t.array(t.unknown),
    from: t.string,
    id: t.string,
    index: t.array(t.string),
    language: t.string,
    machine_learning_job_id: t.string,
    max_signals: t.number,
    query: t.string,
    references: t.array(t.string),
    rule_id: t.string,
    saved_id: t.string,
    tags: t.array(t.string),
    threat: t.array(t.unknown),
    to: t.string,
    updated_by: t.string,
    note: t.string,
  }),
]);

export const NewRulesSchema = t.array(NewRuleSchema);
export type NewRule = t.TypeOf<typeof NewRuleSchema>;

export interface AddRulesProps {
  rule: NewRule;
  signal: AbortSignal;
}

const MetaRule = t.type({
  from: t.string,
});

export const RuleSchema = t.intersection([
  t.type({
    created_at: t.string,
    created_by: t.string,
    description: t.string,
    enabled: t.boolean,
    false_positives: t.array(t.string),
    from: t.string,
    id: t.string,
    interval: t.string,
    immutable: t.boolean,
    name: t.string,
    max_signals: t.number,
    references: t.array(t.string),
    risk_score: t.number,
    rule_id: t.string,
    severity: t.string,
    tags: t.array(t.string),
    type: RuleTypeSchema,
    to: t.string,
    threat: t.array(t.unknown),
    updated_at: t.string,
    updated_by: t.string,
  }),
  t.partial({
    anomaly_threshold: t.number,
    filters: t.array(t.unknown),
    index: t.array(t.string),
    language: t.string,
    last_failure_at: t.string,
    last_failure_message: t.string,
    meta: MetaRule,
    machine_learning_job_id: t.string,
    output_index: t.string,
    query: t.string,
    saved_id: t.string,
    status: t.string,
    status_date: t.string,
    timeline_id: t.string,
    timeline_title: t.string,
    note: t.string,
    version: t.number,
  }),
]);

export const RulesSchema = t.array(RuleSchema);

export type Rule = t.TypeOf<typeof RuleSchema>;
export type Rules = t.TypeOf<typeof RulesSchema>;

export interface RuleError {
  id?: string;
  rule_id?: string;
  error: { status_code: number; message: string };
}

export type BulkRuleResponse = Array<Rule | RuleError>;

export interface RuleResponseBuckets {
  rules: Rule[];
  errors: RuleError[];
}

export interface PaginationOptions {
  page: number;
  perPage: number;
  total: number;
}

export interface FetchRulesProps {
  pagination?: PaginationOptions;
  filterOptions?: FilterOptions;
  signal: AbortSignal;
}

export interface FilterOptions {
  filter: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  showCustomRules?: boolean;
  showElasticRules?: boolean;
  tags?: string[];
}

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: Rule[];
}

export interface FetchRuleProps {
  id: string;
  signal: AbortSignal;
}

export interface EnableRulesProps {
  ids: string[];
  enabled: boolean;
}

export interface DeleteRulesProps {
  ids: string[];
}

export interface DuplicateRulesProps {
  rules: Rule[];
}

export interface BasicFetchProps {
  signal: AbortSignal;
}

export interface ImportRulesProps {
  fileToImport: File;
  overwrite?: boolean;
  signal: AbortSignal;
}

export interface ImportRulesResponseError {
  rule_id: string;
  error: {
    status_code: number;
    message: string;
  };
}

export interface ImportRulesResponse {
  success: boolean;
  success_count: number;
  errors: ImportRulesResponseError[];
}

export interface ExportDocumentsProps {
  ids: string[];
  filename?: string;
  excludeExportDetails?: boolean;
  signal: AbortSignal;
}

export interface RuleStatus {
  current_status: RuleInfoStatus;
  failures: RuleInfoStatus[];
}

export type RuleStatusType = 'executing' | 'failed' | 'going to run' | 'succeeded';
export interface RuleInfoStatus {
  alert_id: string;
  status_date: string;
  status: RuleStatusType | null;
  last_failure_at: string | null;
  last_success_at: string | null;
  last_failure_message: string | null;
  last_success_message: string | null;
}

export type RuleStatusResponse = Record<string, RuleStatus>;

export interface PrePackagedRulesStatusResponse {
  rules_custom_installed: number;
  rules_installed: number;
  rules_not_installed: number;
  rules_not_updated: number;
}
