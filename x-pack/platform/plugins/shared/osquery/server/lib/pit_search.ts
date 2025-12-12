/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchHit, SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { Direction } from '../../common/search_strategy';
import { buildResultsQuery } from '../search_strategy/osquery/factory/results/query.all_results.dsl';

export interface PitSearchParams {
  esClient: ElasticsearchClient;
  pitId: string;
  searchAfter?: SortResults;
  size: number;
  actionId: string;
  kuery?: string;
  startDate?: string;
  sort: Array<{ field: string; direction: Direction }>;
  integrationNamespaces?: string[];
  abortSignal?: AbortSignal;
}

export interface PitSearchResult {
  hits: Array<SearchHit<unknown>>;
  total: number;
  searchAfter?: SortResults;
  pitId?: string;
}

export async function executePitSearch(params: PitSearchParams): Promise<PitSearchResult> {
  const {
    esClient,
    pitId,
    searchAfter,
    size,
    actionId,
    kuery,
    startDate,
    sort,
    integrationNamespaces,
    abortSignal,
  } = params;

  const queryParams = buildResultsQuery({
    actionId,
    kuery,
    startDate,
    sort,
    pitId,
    searchAfter,
    pagination: { activePage: 0, cursorStart: 0, querySize: size },
    integrationNamespaces,
  });

  const response = abortSignal
    ? await esClient.search(queryParams, { signal: abortSignal })
    : await esClient.search(queryParams);

  const hits = response.hits.hits;

  // Handle both ES 7.x+ format (object with value) and legacy format (number)
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const lastHit = hits.length > 0 ? hits[hits.length - 1] : undefined;
  const newSearchAfter = lastHit?.sort;

  const refreshedPitId = response.pit_id;

  return {
    hits,
    total,
    searchAfter: newSearchAfter,
    pitId: refreshedPitId,
  };
}
