/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import {
  fetchFieldCandidates,
  type FetchFieldCandidatesParams,
  type FetchFieldCandidatesParamsArguments,
} from './fetch_field_candidates';
import { getTotalDocCountRequest } from './get_total_doc_count_request';

// TODO Consolidate with duplicate `fetchPValues` in
// `x-pack/plugins/observability_solution/apm/server/routes/correlations/queries/fetch_duration_field_candidates.ts`

export interface FetchIndexInfoParamsArguments {
  skipFieldCandidates?: boolean;
}

export interface FetchIndexInfoParams extends FetchFieldCandidatesParams {
  arguments: AiopsLogRateAnalysisSchema &
    FetchFieldCandidatesParamsArguments &
    FetchIndexInfoParamsArguments;
}
export interface FetchIndexInfoResponse {
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
}: FetchIndexInfoParams): Promise<FetchIndexInfoResponse> => {
  const { skipFieldCandidates = false, ...fetchFieldCandidatesArguments } = args;
  const { textFieldCandidatesOverrides = [], ...params } = fetchFieldCandidatesArguments;

  // There's a bit of logic involved here because we want to fetch the data
  // in parallel but the call to `fetchFieldCandidates` is optional.

  // #1 First we define the promises that would fetch the data.
  const baselineTotalDocCountPromise = esClient.search(
    getTotalDocCountRequest({ ...params, start: params.baselineMin, end: params.baselineMax }),
    {
      signal: abortSignal,
      maxRetries: 0,
    }
  );

  const deviationTotalDocCountPromise = esClient.search(
    getTotalDocCountRequest({
      ...params,
      start: params.deviationMin,
      end: params.deviationMax,
    }),
    {
      signal: abortSignal,
      maxRetries: 0,
    }
  );

  const fetchFieldCandidatesPromise = fetchFieldCandidates({
    esClient,
    abortSignal,
    arguments: fetchFieldCandidatesArguments,
  });

  // #2 Then we build an array of these promises. To be able to handle the
  // responses properly we build a tuple based on the types of the promises.
  const promises: [
    typeof baselineTotalDocCountPromise,
    typeof deviationTotalDocCountPromise,
    typeof fetchFieldCandidatesPromise | undefined
  ] = [
    baselineTotalDocCountPromise,
    deviationTotalDocCountPromise,
    !skipFieldCandidates ? fetchFieldCandidatesPromise : undefined,
  ];

  // #3 Finally, we await the promises and return the results.
  const [respBaselineTotalDocCount, respDeviationTotalDocCount, fieldCandidates] =
    await Promise.all(promises);

  const baselineTotalDocCount = (respBaselineTotalDocCount.hits.total as estypes.SearchTotalHits)
    .value;
  const deviationTotalDocCount = (respDeviationTotalDocCount.hits.total as estypes.SearchTotalHits)
    .value;

  return {
    keywordFieldCandidates: fieldCandidates?.selectedKeywordFieldCandidates.sort() ?? [],
    textFieldCandidates: fieldCandidates?.textFieldCandidates.sort() ?? [],
    baselineTotalDocCount,
    deviationTotalDocCount,
    zeroDocsFallback: baselineTotalDocCount === 0 || deviationTotalDocCount === 0,
  };
};
