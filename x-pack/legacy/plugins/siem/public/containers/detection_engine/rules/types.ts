/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const RuleSchema = t.intersection([
  t.type({
    created_by: t.string,
    description: t.string,
    enabled: t.boolean,
    id: t.string,
    index: t.array(t.string),
    interval: t.string,
    language: t.string,
    name: t.string,
    query: t.string,
    rule_id: t.string,
    severity: t.string,
    type: t.string,
    updated_by: t.string,
  }),
  t.partial({
    false_positives: t.array(t.string),
    from: t.string,
    max_signals: t.number,
    references: t.array(t.string),
    tags: t.array(t.string),
    to: t.string,
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
