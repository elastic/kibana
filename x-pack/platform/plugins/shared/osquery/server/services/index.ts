/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  fetchLiveQueryDetails,
  fetchLiveQueryResults,
  waitForQueryCompletion,
  waitForResultsCount,
} from './live_query_service';

export type {
  LiveQueryStatus,
  LiveQueryStatusQuery,
  LiveQueryResults,
  FetchLiveQueryDetailsOptions,
  FetchLiveQueryResultsOptions,
  WaitForCompletionOptions,
  WaitForResultsCountOptions,
} from './live_query_service';
