/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '@kbn/task-manager-plugin/server';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../../../rule_executor/constants';
import { getRuleExecutorTaskId } from '../../../rule_executor/schedule';
import type { FindRuleExecutionsQuery, RuleExecutionSortField } from '../types';

/**
 * ES sort fields keyed by the public {@link RuleExecutionSortField} values.
 *
 * The mapping is intentionally narrow: only fields the spec exposes are
 * mapped, so the public sort surface cannot grow into arbitrary ES field
 * access by accident.
 */
const SORT_FIELD_TO_ES: Record<RuleExecutionSortField, string> = {
  startedAt: 'event.start',
  duration: 'event.duration',
};

/**
 * Builds the Elasticsearch search request body for
 * `EventLogService.findRuleExecutions`.
 *
 * Space scoping is enforced **unconditionally** by a `prefix` filter on
 * `kibana.task.id` (`{taskType}:{spaceId}:`). Task Manager's `task-run`
 * events carry no `kibana.space_ids` field, so this is the only available
 * carrier for the request space — and gating it on `ruleIds` would let
 * a no-filter call read across spaces. When `ruleIds` is also provided
 * the `terms` filter narrows further within the same prefix.
 *
 * `track_total_hits` is intentionally not set. ES defaults to capping
 * `total` at 10000 with `relation: 'gte'`.
 */
export const buildRuleExecutionsQuery = (query: FindRuleExecutionsQuery): SearchRequest => {
  const {
    spaceId,
    ruleIds,
    outcomes,
    from,
    to,
    sort = 'startedAt',
    sortOrder = 'desc',
    page,
    perPage,
  } = query;

  const filters: QueryDslQueryContainer[] = [
    { term: { 'event.provider': EVENT_LOG_PROVIDER } },
    { term: { 'kibana.task.type': ALERTING_RULE_EXECUTOR_TASK_TYPE } },
    { term: { 'event.action': EVENT_LOG_ACTIONS.taskRun } },
    { prefix: { 'kibana.task.id': `${ALERTING_RULE_EXECUTOR_TASK_TYPE}:${spaceId}:` } },
  ];

  if (ruleIds && ruleIds.length > 0) {
    filters.push({
      terms: {
        'kibana.task.id': ruleIds.map((ruleId) => getRuleExecutorTaskId({ ruleId, spaceId })),
      },
    });
  }

  if (outcomes && outcomes.length > 0) {
    filters.push({ terms: { 'event.outcome': outcomes } });
  }

  if (from || to) {
    filters.push({
      range: {
        'event.start': {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
    });
  }

  return {
    query: { bool: { filter: filters } },
    sort: [{ [SORT_FIELD_TO_ES[sort]]: { order: sortOrder } }],
    from: (page - 1) * perPage,
    size: perPage,
  };
};
