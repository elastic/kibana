/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_KPI_FILTER_CASE_IDS } from '../../../../common/constants';
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

/**
 * Builds the search of the cases that closed in the range of the context. The forced filters (space, owner,
 * list case ids, and the close date range) are separate clauses. An open case has no close date, so it is not selected.
 */
export const buildCaseSelectionSearch = (context: KpiQueryContext): KpiSearchRequest => ({
  index: 'cases',
  body: {
    size: MAX_KPI_FILTER_CASE_IDS,
    track_total_hits: true,
    _source: ['case.id'],
    query: {
      bool: {
        filter: [
          ...buildForcedFilters('cases', context, 'closed_at'),
          { exists: { field: 'case.closed_at' } },
        ],
      },
    },
  },
});

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
