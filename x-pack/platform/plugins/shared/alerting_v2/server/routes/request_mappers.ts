/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CountPolicyExecutionEventsRequest,
  FindActionPoliciesRequest,
  FindRulesRequest,
  GetRuleExecutionsRequest,
  ListPolicyExecutionHistoryRequest,
} from '@kbn/alerting-v2-schemas';
import type { FindRulesArgs } from '../lib/rules_client';
import type { FindActionPoliciesArgs } from '../lib/action_policy_client';
import type {
  CountNewEventsSinceArgs,
  ListExecutionHistoryArgs,
} from '../lib/action_policy_execution_history_client';
import type { GetRuleExecutionsArgs } from '../lib/execution_history_client';

/**
 * Route-layer mappers between the snake_case API request schemas from
 * `@kbn/alerting-v2-schemas` and the camelCase client `…Args` types.
 *
 * These are the single, typed, unit-testable point where the wire contract is
 * translated to what each client expects. The explicit `…Args` return types
 * keep the translation honest (wrong keys / value types fail to compile) and
 * localize the conversion so a missing field is caught in one place rather
 * than drifting inside each route handler. They mirror the UI-side mappers in
 * `public/hooks/query_param_mappers.ts`.
 *
 * The execution-history mappers deliberately omit the `request` field: the
 * `KibanaRequest` is not derived from the query and is supplied by the route.
 */

export const toFindRulesArgs = ({
  page,
  per_page: perPage,
  filter,
  search,
  sort_field: sortField,
  sort_order: sortOrder,
}: FindRulesRequest): FindRulesArgs => ({
  page,
  perPage,
  filter,
  search,
  sortField,
  sortOrder,
});

export const toFindActionPoliciesArgs = ({
  page,
  per_page: perPage,
  search,
  tags,
  enabled,
  sort_field: sortField,
  sort_order: sortOrder,
}: FindActionPoliciesRequest): FindActionPoliciesArgs => ({
  page,
  perPage,
  search,
  tags,
  enabled,
  sortField,
  sortOrder,
});

export const toListExecutionHistoryArgs = ({
  page,
  per_page: perPage,
  search,
  rule_ids: ruleIds,
  outcome,
  episode_ids: episodeIds,
}: ListPolicyExecutionHistoryRequest): Omit<ListExecutionHistoryArgs, 'request'> => ({
  page,
  perPage,
  search,
  ruleIds,
  outcome,
  episodeIds,
});

export const toCountNewEventsSinceArgs = ({
  since,
  search,
  rule_ids: ruleIds,
  outcome,
}: CountPolicyExecutionEventsRequest): Omit<CountNewEventsSinceArgs, 'request'> => ({
  since,
  search,
  ruleIds,
  outcome,
});

export const toGetRuleExecutionsArgs = ({
  rule_id: ruleIds,
  outcome: outcomes,
  from,
  to,
  sort,
  sort_order: sortOrder,
  page,
  per_page: perPage,
}: GetRuleExecutionsRequest): GetRuleExecutionsArgs => ({
  ruleIds,
  outcomes,
  from,
  to,
  sort: sort === 'started_at' ? 'startedAt' : sort,
  sortOrder,
  page,
  perPage,
});
