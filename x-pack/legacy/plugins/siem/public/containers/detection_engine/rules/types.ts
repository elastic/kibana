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
    threats: t.array(t.unknown),
    to: t.string,
    updated_by: t.string,
  }),
]);

export const NewRulesSchema = t.array(NewRuleSchema);
export type NewRule = t.TypeOf<typeof NewRuleSchema>;

export interface AddRulesProps {
  rule: NewRule;
  kbnVersion: string;
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
    meta: MetaRule,
    query: t.string,
    references: t.array(t.string),
    risk_score: t.number,
    rule_id: t.string,
    severity: t.string,
    tags: t.array(t.string),
    type: t.string,
    to: t.string,
    threats: t.array(t.unknown),
    updated_at: t.string,
    updated_by: t.string,
  }),
  t.partial({
    saved_id: t.string,
    timeline_id: t.string,
    timeline_title: t.string,
  }),
]);

export const RulesSchema = t.array(RuleSchema);

export type Rule = t.TypeOf<typeof RuleSchema>;
export type Rules = t.TypeOf<typeof RulesSchema>;

export interface PaginationOptions {
  page: number;
  perPage: number;
  total: number;
}

export interface FetchRulesProps {
  pagination?: PaginationOptions;
  filterOptions?: FilterOptions;
  id?: string;
  kbnVersion: string;
  signal: AbortSignal;
}

export interface FilterOptions {
  filter: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: Rule[];
}

export interface FetchRuleProps {
  id: string;
  kbnVersion: string;
  signal: AbortSignal;
}

export interface EnableRulesProps {
  ids: string[];
  enabled: boolean;
  kbnVersion: string;
}

export interface DeleteRulesProps {
  ids: string[];
  kbnVersion: string;
}

export interface DuplicateRulesProps {
  rules: Rules;
  kbnVersion: string;
}
