/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CountPolicyExecutionEventsRequest,
  FindActionPoliciesRequest,
  FindActionPoliciesSortField,
  FindRulesRequest,
  FindRulesSortField,
  GetRuleExecutionsRequest,
  ListPolicyExecutionHistoryRequest,
  PolicyExecutionOutcomeFilter,
  RuleExecutionOutcome,
} from '@kbn/alerting-v2-schemas';

/**
 * Camel↔snake mappers between the UI's camelCase view state and the snake_case
 * API request schemas from `@kbn/alerting-v2-schemas`.
 *
 * The UI keeps its idiomatic camelCase surface; these mappers are the single,
 * typed, unit-testable point where that surface is translated to the wire
 * contract. The explicit `…Request` return types keep the translation honest
 * (wrong keys / value types fail to compile) and localize the conversion so a
 * missing field is caught in one place rather than silently dropped in a hook.
 */

export interface FindRulesUiParams {
  page?: number;
  perPage?: number;
  filter?: string;
  search?: string;
  sortField?: FindRulesSortField;
  sortOrder?: 'asc' | 'desc';
}

export const toFindRulesRequest = ({
  page,
  perPage,
  filter,
  search,
  sortField,
  sortOrder,
}: FindRulesUiParams): FindRulesRequest => ({
  page,
  per_page: perPage,
  filter,
  search,
  sort_field: sortField,
  sort_order: sortOrder,
});

export interface FindActionPoliciesUiParams {
  page?: number;
  perPage?: number;
  search?: string;
  tags?: string[];
  enabled?: boolean;
  sortField?: FindActionPoliciesSortField;
  sortOrder?: 'asc' | 'desc';
}

export const toFindActionPoliciesRequest = ({
  page,
  perPage,
  search,
  tags,
  enabled,
  sortField,
  sortOrder,
}: FindActionPoliciesUiParams): FindActionPoliciesRequest => ({
  page,
  per_page: perPage,
  search,
  tags,
  enabled,
  sort_field: sortField,
  sort_order: sortOrder,
});

export interface ListExecutionHistoryUiParams {
  page?: number;
  perPage?: number;
  search?: string;
  ruleIds?: string[];
  outcome?: PolicyExecutionOutcomeFilter;
}

export const toListExecutionHistoryRequest = ({
  page,
  perPage,
  search,
  ruleIds,
  outcome,
}: ListExecutionHistoryUiParams): ListPolicyExecutionHistoryRequest => ({
  page,
  per_page: perPage,
  search,
  rule_ids: ruleIds,
  outcome,
});

export interface CountNewExecutionEventsUiParams {
  since: string;
  search?: string;
  ruleIds?: string[];
  outcome?: PolicyExecutionOutcomeFilter;
}

export const toCountNewExecutionEventsRequest = ({
  since,
  search,
  ruleIds,
  outcome,
}: CountNewExecutionEventsUiParams): CountPolicyExecutionEventsRequest => ({
  since,
  search,
  rule_ids: ruleIds,
  outcome,
});

export interface GetRuleExecutionsUiParams {
  page?: number;
  perPage?: number;
  ruleIds?: string[];
  outcome?: RuleExecutionOutcome[];
  from?: string;
  to?: string;
  sort?: 'startedAt' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export const toGetRuleExecutionsRequest = ({
  page,
  perPage,
  ruleIds,
  outcome,
  from,
  to,
  sort,
  sortOrder,
}: GetRuleExecutionsUiParams): Partial<GetRuleExecutionsRequest> => ({
  page,
  per_page: perPage,
  rule_id: ruleIds,
  outcome,
  from,
  to,
  sort: sort === 'startedAt' ? 'started_at' : sort,
  sort_order: sortOrder,
});
