/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { fetchFieldCandidates, type FetchFieldCandidatesParams } from './fetch_field_candidates';

import { getTotalDocCountRequest } from './get_total_doc_count_request';

// TODO Consolidate with duplicate `fetchPValues` in
// `x-pack/plugins/observability_solution/apm/server/routes/correlations/queries/fetch_duration_field_candidates.ts`

export interface IndexInfo {
  keywordFieldCandidates: string[];
  textFieldCandidates: string[];
  baselineTotalDocCount: number;
  deviationTotalDocCount: number;
  zeroDocsFallback: boolean;
}

export const fetchIndexInfo = async ({
  esClient,
  abortSignal,
  arguments: args,
}: FetchFieldCandidatesParams): Promise<IndexInfo> => {
  const { textFieldCandidatesOverrides = [], ...params } = args;

  const [fieldCandidates, respBaselineTotalDocCount, respDeviationTotalDocCount] =
    await Promise.all([
      fetchFieldCandidates({
        esClient,
        abortSignal,
        arguments: args,
      }),
      esClient.search(
        getTotalDocCountRequest({ ...params, start: params.baselineMin, end: params.baselineMax }),
        {
          signal: abortSignal,
          maxRetries: 0,
        }
      ),
      esClient.search(
        getTotalDocCountRequest({
          ...params,
          start: params.deviationMin,
          end: params.deviationMax,
        }),
        {
          signal: abortSignal,
          maxRetries: 0,
        }
      ),
    ]);

  const baselineTotalDocCount = (respBaselineTotalDocCount.hits.total as estypes.SearchTotalHits)
    .value;
  const deviationTotalDocCount = (respDeviationTotalDocCount.hits.total as estypes.SearchTotalHits)
    .value;

  return {
    keywordFieldCandidates: fieldCandidates.selectedKeywordFieldCandidates.sort(),
    textFieldCandidates: fieldCandidates.textFieldCandidates.sort(),
    baselineTotalDocCount,
    deviationTotalDocCount,
    zeroDocsFallback: baselineTotalDocCount === 0 || deviationTotalDocCount === 0,
  };
};
