/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { PolicyExecutionOutcome } from '@kbn/alerting-v2-schemas';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../../../../../common/saved_object_types';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../../../dispatcher/steps/constants';

/**
 * Filter inputs shared by the action-policy event queries.
 *
 * `outcomes` narrows `event.action` to the provided actions (`dispatched` |
 * `throttled` | `dispatch_failed`). When omitted or empty, all three are
 * matched. `policyIds` /
 * `ruleIds`, when provided, must match an entry in the nested
 * `kibana.saved_objects` array — or, for rules only, in the top-level
 * `kibana.alerting_v2.dispatcher.rule_ids` spillover field that the
 * dispatcher writes when a single event exceeds the nested ref cap (see
 * `store_execution_history_step.ts:157`).
 */
export interface BuildActionPolicyEventsQueryParams {
  spaceId: string;
  /** Inclusive lower bound applied to `@timestamp`. */
  startDate: string;
  outcomes?: PolicyExecutionOutcome[];
  policyIds?: string[];
  ruleIds?: string[];
  /**
   * Explicit rule filter. Applied as an AND clause: the event must reference
   * at least one of these rule ids (nested saved-object ref or dispatcher
   * rule-id spillover). Independent from `ruleIds`, which is OR-combined with
   * `policyIds` for free-text search discovery.
   */
  mandatoryRuleIds?: string[];
  /**
   * Episode filter. Applied as an AND clause: the event must reference at
   * least one of these episode ids in the top-level
   * `kibana.alerting_v2.dispatcher.episode_ids` keyword array.
   */
  episodeIds?: string[];
}

/**
 * Extra inputs the find query needs on top of the shared filters.
 */
export interface BuildFindActionPolicyEventsQueryParams extends BuildActionPolicyEventsQueryParams {
  /** 1-based page number. */
  page: number;
  perPage: number;
}

/**
 * Builds the Elasticsearch search request body for a *find* read of the
 * action-policy execution history. Returns a hit window sized by `page`
 * and `perPage`.
 *
 * See {@link buildBaseActionPolicyEventsQuery} for the shared filter and
 * sort logic.
 */
export const buildFindActionPolicyEventsQuery = (
  params: BuildFindActionPolicyEventsQueryParams
): SearchRequest => ({
  ...buildBaseActionPolicyEventsQuery(params),
  from: (params.page - 1) * params.perPage,
  size: params.perPage,
});

/**
 * Composes the filters, sort, and `track_total_hits` setting that the
 * find query uses. Kept private to this module so the public entry point
 * stays the only call site — adding another query should go through this
 * helper as well.
 *
 * The query reads documents emitted by `store_execution_history_step.ts`:
 *
 *  - `event.provider` is always `alerting_v2`.
 *  - `event.action` is one of `dispatched` / `throttled` / `dispatch_failed`.
 *  - `kibana.space_ids: [spaceId]` for cross-space isolation.
 *  - `kibana.saved_objects` (nested) holds policy + rule refs.
 *  - `kibana.alerting_v2.dispatcher.rule_ids` (top-level keyword) holds the
 *    rule-id spillover when the nested ref count would exceed the cap.
 *
 * Authorization is intentionally *not* enforced at this layer. The route
 * privilege (`executionHistory.read`) is the sole gate; see spec §6.4.
 *
 * `track_total_hits: true` is set so callers see precise counts (the list
 * `totalEvents` and the "new events since" badge depend on exact totals).
 */
const buildBaseActionPolicyEventsQuery = (
  params: BuildActionPolicyEventsQueryParams
): SearchRequest => {
  const filters: QueryDslQueryContainer[] = [
    { term: { 'event.provider': ACTION_POLICY_EVENT_PROVIDER } },
    { term: { 'kibana.space_ids': params.spaceId } },
    { range: { '@timestamp': { gte: params.startDate } } },
    actionFilter(params.outcomes),
  ];

  const idFilter = buildIdFilter(params.policyIds, params.ruleIds);
  if (idFilter) {
    filters.push(idFilter);
  }

  if (params.mandatoryRuleIds && params.mandatoryRuleIds.length > 0) {
    filters.push(buildMandatoryRuleClause(params.mandatoryRuleIds));
  }

  if (params.episodeIds && params.episodeIds.length > 0) {
    filters.push({ terms: { 'kibana.alerting_v2.dispatcher.episode_ids': params.episodeIds } });
  }

  return {
    query: { bool: { filter: filters } },
    sort: [{ '@timestamp': { order: 'desc' } }],
    track_total_hits: true,
  };
};

const actionFilter = (outcomes: PolicyExecutionOutcome[] | undefined): QueryDslQueryContainer => {
  const actions =
    outcomes && outcomes.length > 0
      ? outcomes
      : [
          ACTION_POLICY_EVENT_ACTIONS.DISPATCHED,
          ACTION_POLICY_EVENT_ACTIONS.THROTTLED,
          ACTION_POLICY_EVENT_ACTIONS.DISPATCH_FAILED,
        ];

  return { terms: { 'event.action': actions } };
};

/**
 * Composes a single `bool.should` clause that matches when an event
 * references *any* of the provided ids — checking the nested
 * `kibana.saved_objects` array and the top-level rule-id spillover
 * (`kibana.alerting_v2.dispatcher.rule_ids`).
 *
 * Each event stores both policy *and* rule refs in the same nested array,
 * so the nested clauses must pin both `kibana.saved_objects.type` *and*
 * `kibana.saved_objects.id` — otherwise an id that happens to be shared
 * between a policy and a rule would match the wrong saved-object type.
 *
 * Returns `undefined` when there is nothing to filter on so callers can
 * skip pushing an empty clause.
 */
const buildIdFilter = (
  policyIds: string[] | undefined,
  ruleIds: string[] | undefined
): QueryDslQueryContainer | undefined => {
  const should: QueryDslQueryContainer[] = [];

  if (policyIds && policyIds.length > 0) {
    should.push(buildNestedSavedObjectClause(ACTION_POLICY_SAVED_OBJECT_TYPE, policyIds));
  }

  if (ruleIds && ruleIds.length > 0) {
    should.push(buildNestedSavedObjectClause(RULE_SAVED_OBJECT_TYPE, ruleIds));
    should.push({ terms: { 'kibana.alerting_v2.dispatcher.rule_ids': ruleIds } });
  }

  if (should.length === 0) return undefined;

  return { bool: { should, minimum_should_match: 1 } };
};

const buildMandatoryRuleClause = (ruleIds: string[]): QueryDslQueryContainer => ({
  bool: {
    should: [
      buildNestedSavedObjectClause(RULE_SAVED_OBJECT_TYPE, ruleIds),
      { terms: { 'kibana.alerting_v2.dispatcher.rule_ids': ruleIds } },
    ],
    minimum_should_match: 1,
  },
});

const buildNestedSavedObjectClause = (type: string, ids: string[]): QueryDslQueryContainer => ({
  nested: {
    path: 'kibana.saved_objects',
    query: {
      bool: {
        filter: [
          { term: { 'kibana.saved_objects.type': type } },
          { terms: { 'kibana.saved_objects.id': ids } },
        ],
      },
    },
  },
});
