/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSyncJob, Paginate } from '@kbn/search-connectors';
import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface FetchSyncJobsArgs {
  connectorId: string;
  from?: number;
  size?: number;
  type?: 'content' | 'access_control';
  http?: HttpSetup;
}

export type FetchSyncJobsResponse = Paginate<ConnectorSyncJob>;

export const fetchSyncJobs = async ({
  connectorId,
  http,
  from = 0,
  size = 10,
  type,
}: FetchSyncJobsArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/sync_jobs`;
  const query = { from, size, type };
  return await http?.get<Paginate<ConnectorSyncJob>>(route, { query });
};

export const FetchSyncJobsApiLogic = createApiLogic(
  ['search_connectors_content', 'fetch_sync_api_logic'],
  fetchSyncJobs
);
