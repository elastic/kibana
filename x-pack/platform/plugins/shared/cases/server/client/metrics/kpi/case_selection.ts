/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { MAX_KPI_FILTER_CASE_IDS } from '../../../../common/constants';
import type { KpiDateBasis } from '../../../../common/types/domain';
import type { KpiQueryContext, KpiSearchRequest } from './query_builder';
import { buildForcedFilters } from './query_builder';
import { isIncompleteKpiSearchResponse } from './result';

const CASE_LIMIT_MESSAGE = `More than ${MAX_KPI_FILTER_CASE_IDS} cases closed in this range. Select a shorter range to see this metric.`;
const FAILED_MESSAGE = 'The metric search failed.';
const INCOMPLETE_MESSAGE = 'The metric search returned incomplete results.';

interface CaseSelectionSource {
  case?: { id?: string };
}

export type CaseSelection = { type: 'ids'; ids: string[] } | { type: 'error'; message: string };

export interface CaseSelectionOptions {
  /**
   * The close date selects the cases that closed in the range. The attach date does not filter by the close date.
   * No value means the close date.
   */
  basis?: KpiDateBasis;
  /**
   * KQL on the .cases fields. It is parsed here and is one separate filter entry. It throws when the KQL is not valid.
   */
  caseQuery?: string;
}

/**
 * Builds the search of the cases for an alert metric. The forced filters (space, owner, list case ids) are separate
 * clauses, and the admin case query is one more separate clause, never inside a forced clause.
 * With the close date basis, the range applies to the close date, and an open case has no close date, so it is not selected.
 * With the attach date basis, the search has no close date range. It only selects the cases that changed since the
 * start of the range, because an alert attach updates the case.
 */
export const buildCaseSelectionSearch = (
  context: KpiQueryContext,
  { basis = 'case_closed_at', caseQuery }: CaseSelectionOptions = {}
): KpiSearchRequest => {
  const isClosedBasis = basis === 'case_closed_at';
  const forcedFilters = isClosedBasis
    ? [
        ...buildForcedFilters('cases', context, 'closed_at'),
        { exists: { field: 'case.closed_at' } },
      ]
    : [
        ...buildForcedFilters('cases', { ...context, from: undefined, to: undefined }),
        ...(context.from != null ? [{ range: { 'case.updated_at': { gte: context.from } } }] : []),
      ];
  const queryClause =
    caseQuery != null && caseQuery.trim() !== ''
      ? [toElasticsearchQuery(fromKueryExpression(caseQuery))]
      : [];

  return {
    index: 'cases',
    body: {
      size: MAX_KPI_FILTER_CASE_IDS,
      track_total_hits: true,
      _source: ['case.id'],
      query: { bool: { filter: [...forcedFilters, ...queryClause] } },
    },
  };
};

/**
 * Reads the selected case ids of one response, or an error when the search failed, is incomplete,
 * or selected more cases than the limit.
 */
export const readCaseSelection = (
  response: estypes.MsearchResponseItem | undefined
): CaseSelection => {
  if (response == null || 'error' in response) {
    return { type: 'error', message: FAILED_MESSAGE };
  }

  if (isIncompleteKpiSearchResponse(response)) {
    return { type: 'error', message: INCOMPLETE_MESSAGE };
  }

  const { total } = response.hits;
  const totalHits = typeof total === 'number' ? total : total?.value ?? 0;

  if (totalHits > MAX_KPI_FILTER_CASE_IDS) {
    return { type: 'error', message: CASE_LIMIT_MESSAGE };
  }

  const hits = response.hits.hits as Array<estypes.SearchHit<CaseSelectionSource>>;

  return {
    type: 'ids',
    ids: hits.flatMap(({ _source: source }) => (source?.case?.id != null ? [source.case.id] : [])),
  };
};
