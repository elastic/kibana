/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../../../../../common/saved_object_types';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../../../dispatcher/steps/constants';
import {
  buildNestedSavedObjectClause,
  buildMandatoryRuleClause,
} from './action_policy_events_query';

export interface BuildDispatchFailuresQueryParams {
  spaceId: string;
  from?: string;
  to?: string;
  policyIds?: string[];
  ruleIds?: string[];
  workflowIds?: string[];
  episodeIds?: string[];
  reasons?: string[];
  page: number;
  perPage: number;
}

export const buildDispatchFailuresQuery = ({
  spaceId,
  from,
  to,
  policyIds,
  ruleIds,
  workflowIds,
  episodeIds,
  reasons,
  page,
  perPage,
}: BuildDispatchFailuresQueryParams): SearchRequest => {
  const filters: QueryDslQueryContainer[] = [
    { term: { 'event.provider': ACTION_POLICY_EVENT_PROVIDER } },
    { term: { 'event.action': ACTION_POLICY_EVENT_ACTIONS.DISPATCH_FAILED } },
    { term: { 'kibana.space_ids': spaceId } },
    {
      range: {
        '@timestamp': {
          gte: from ?? 'now-24h',
          ...(to ? { lte: to } : {}),
        },
      },
    },
  ];

  if (reasons && reasons.length > 0) {
    filters.push({ terms: { 'kibana.alerting_v2.dispatcher.failure_reason': reasons } });
  }

  if (workflowIds && workflowIds.length > 0) {
    filters.push({ terms: { 'kibana.alerting_v2.dispatcher.workflow_ids': workflowIds } });
  }

  if (episodeIds && episodeIds.length > 0) {
    filters.push({ terms: { 'kibana.alerting_v2.dispatcher.episode_ids': episodeIds } });
  }

  const idFilter = buildIdFilter(policyIds, ruleIds);
  if (idFilter) filters.push(idFilter);

  return {
    query: { bool: { filter: filters } },
    sort: [{ '@timestamp': { order: 'desc' as const } }],
    track_total_hits: true,
    from: (page - 1) * perPage,
    size: perPage,
  };
};

const buildIdFilter = (
  policyIds: string[] | undefined,
  ruleIds: string[] | undefined
): QueryDslQueryContainer | undefined => {
  const should: QueryDslQueryContainer[] = [];

  if (policyIds && policyIds.length > 0) {
    should.push(buildNestedSavedObjectClause(ACTION_POLICY_SAVED_OBJECT_TYPE, policyIds));
  }

  if (ruleIds && ruleIds.length > 0) {
    should.push(buildMandatoryRuleClause(ruleIds));
  }

  if (should.length === 0) return undefined;

  return { bool: { should, minimum_should_match: 1 } };
};
