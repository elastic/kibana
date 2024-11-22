/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchQuery } from '@kbn/core-http-browser';

import { HistoricalResult } from '../../../../../../types';
import { INTERNAL_API_VERSION } from '../../../../../../constants';
import { GET_INDEX_RESULTS } from '../constants';
import {
  DEFAULT_HISTORICAL_RESULTS_START_DATE,
  DEFAULT_HISTORICAL_RESULTS_END_DATE,
} from '../../../index_check_flyout/constants';
import { FetchHistoricalResultsOpts } from '../../../index_check_flyout/types';

export interface FetchHistoricalResultsResponse {
  data: HistoricalResult[];
  total: number;
}

export interface FetchHistoricalResultsReturnValue {
  results: HistoricalResult[];
  total: number;
}

export async function fetchHistoricalResults({
  indexName,
  size,
  from,
  startDate,
  endDate,
  outcome,
  httpFetch,
  abortController,
}: FetchHistoricalResultsOpts): Promise<FetchHistoricalResultsReturnValue> {
  const query: HttpFetchQuery = {
    startDate: DEFAULT_HISTORICAL_RESULTS_START_DATE,
    endDate: DEFAULT_HISTORICAL_RESULTS_END_DATE,
  };

  if (from !== undefined) {
    query.from = from;
  }

  if (size !== undefined) {
    query.size = size;
  }

  if (outcome !== undefined) {
    query.outcome = outcome;
  }

  if (startDate !== undefined) {
    query.startDate = startDate;
  }

  if (endDate !== undefined) {
    query.endDate = endDate;
  }

  const route = GET_INDEX_RESULTS.replace('{indexName}', indexName);
  const results = await httpFetch<FetchHistoricalResultsResponse>(route, {
    method: 'GET',
    signal: abortController.signal,
    version: INTERNAL_API_VERSION,
    query,
  });
  return {
    results: results.data,
    total: results.total,
  };
}
