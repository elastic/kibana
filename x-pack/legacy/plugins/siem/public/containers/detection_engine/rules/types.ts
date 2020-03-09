/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const NewRuleSchema = t.intersection([
  t.type({
    description: t.string,
    enabled: t.boolean,
    filters: t.array(t.unknown),
    index: t.array(t.string),
    interval: t.string,
    language: t.string,
    name: t.string,
    query: t.string,
    risk_score: t.number,
    severity: t.string,
    type: t.union([t.literal('query'), t.literal('saved_query')]),
  }),
  t.partial({
    created_by: t.string,
    false_positives: t.array(t.string),
    from: t.string,
    id: t.string,
    max_signals: t.number,
    references: t.array(t.string),
    rule_id: t.string,
    saved_id: t.string,
    tags: t.array(t.string),
    threat: t.array(t.unknown),
    to: t.string,
    updated_by: t.string,
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
    filters: t.array(t.unknown),
    from: t.string,
    id: t.string,
    index: t.array(t.string),
    interval: t.string,
    immutable: t.boolean,
    language: t.string,
    name: t.string,
    max_signals: t.number,
    query: t.string,
    references: t.array(t.string),
    risk_score: t.number,
    rule_id: t.string,
    severity: t.string,
    tags: t.array(t.string),
    type: t.string,
    to: t.string,
    threat: t.array(t.unknown),
    updated_at: t.string,
    updated_by: t.string,
  }),
  t.partial({
    last_failure_at: t.string,
    last_failure_message: t.string,
    meta: MetaRule,
    output_index: t.string,
    saved_id: t.string,
    status: t.string,
    status_date: t.string,
    timeline_id: t.string,
    timeline_title: t.string,
    version: t.number,
  }),
]);

export const RulesSchema = t.array(RuleSchema);

export type Rule = t.TypeOf<typeof RuleSchema>;
export type Rules = t.TypeOf<typeof RulesSchema>;

export interface RuleError {
  rule_id: string;
  error: { status_code: number; message: string };
}

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

export interface ExportRulesProps {
  ruleIds?: string[];
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
