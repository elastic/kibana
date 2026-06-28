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
 * The filter list is the union of three concerns:
 *
 *  1. **Source pinning** — `event.provider`, `kibana.task.type`,
 *     `event.action` together identify the Task Manager `task-run` event
 *     emitted by the alerting v2 rule executor.
 *  2. **Space scoping** — enforced unconditionally by a `prefix` filter
 *     on `kibana.task.id` (`{taskType}:{spaceId}:`). Task Manager's
 *     `task-run` events carry no `kibana.space_ids` field, so this is
 *     the only available carrier for the request space — and gating it
 *     on `ruleIds` would let a no-filter call read across spaces. When
 *     `ruleIds` is also provided, an additional `terms` clause narrows
 *     further within the same prefix.
 *  3. **Structural-fit filters** — `exists` on `event.start` /
 *     `event.end`. These mirror the structural prerequisites for
 *     building a {@link RuleExecution}, so any hit ES returns is
 *     guaranteed to normalize successfully. That keeps `hits.total`
 *     consistent with the items the API returns — `total` and pagination
 *     are drift-free instead of slowly diverging by the count of
 *     malformed rows. `event.outcome` is intentionally **not** pinned
 *     here even though our public enum is narrow: the normalizer maps
 *     out-of-set values to `'unknown'` rather than rejecting them, so
 *     we want every row through and we want the count to include them.
 *     This avoids cat-and-mouse with Task Manager / ECS if the outcome
 *     vocabulary ever grows.
 *     Emission of the
 *     `EXECUTION_HISTORY_NORMALIZER_REJECTED_EVENTS` log code from
 *     `EventLogService.findRuleExecutions` should therefore never fire
 *     in steady state; if it does, either the upstream contract changed
 *     (Task Manager schema drift) or a filter here has fallen out of
 *     sync with the normalizer.
 *
 * `track_total_hits` is intentionally not set. The schema caps the
 * paginatable window via {@link RULE_EXECUTIONS_MAX_RESULT_WINDOW}
 * (= 10_000), which mirrors Elasticsearch's default
 * `index.max_result_window`. Both are independently configurable, but
 * the schema cap binds first — the request validator rejects
 * `page * perPage > 10_000` before we hit ES. So an exact count
 * above 10_000 would surface a number we cannot let the caller page
 * into, while paying ES' counting cost on every request. If/when we
 * switch to `search_after` and lift the page cap, revisit this knob.
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
    { exists: { field: 'event.start' } },
    { exists: { field: 'event.end' } },
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
