/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FindRuleExecutionsQuery,
  PaginatedResult,
  RuleExecution,
} from '../services/event_log_service/types';

/**
 * Client-side arguments for {@link ExecutionHistoryClientContract.getRuleExecutions}.
 */
export type ListRuleExecutionsArgs = Omit<FindRuleExecutionsQuery, 'spaceId'>;

/**
 * Internal (camelCase) result of a rule-execution read. The route maps it to
 * the snake_case API contract via `toListRuleExecutionsResponse`.
 */
export type ListRuleExecutionsResult = PaginatedResult<RuleExecution>;

export interface ExecutionHistoryClientContract {
  listRuleExecutions(args: ListRuleExecutionsArgs): Promise<ListRuleExecutionsResult>;
}
