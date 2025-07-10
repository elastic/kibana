/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { SyncJobsStats } from '../../../common/stats';
import { createApiLogic } from '../api_logic/create_api_logic';

export type FetchSyncJobsStatsResponse = SyncJobsStats;

export interface FetchSyncJobsStatsApiLogicArgs {
  isCrawler?: boolean;
  http?: HttpSetup;
}

export const fetchSyncJobsStats = async ({ isCrawler, http }: FetchSyncJobsStatsApiLogicArgs) => {
  const route = '/internal/content_connectors/stats/sync_jobs';
  const options = isCrawler !== undefined ? { query: { isCrawler } } : undefined;
  return await http?.get<FetchSyncJobsStatsResponse>(route, options);
};

export const FetchSyncJobsStatsApiLogic = createApiLogic(
  ['search_connectors_content', 'fetch_sync_jobs_stats_api_logic'],
  fetchSyncJobsStats
);
