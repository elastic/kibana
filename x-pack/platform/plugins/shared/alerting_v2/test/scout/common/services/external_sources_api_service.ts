/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type {
  CreateExternalSourceData,
  FindExternalSourcesResponse,
  ExternalSourceResponse,
} from '@kbn/alerting-v2-schemas';
import {
  COMMON_HEADERS,
  EXTERNAL_SOURCE_API_PATH,
  EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
} from '../constants';
import { getExternalSourceUrl, getListExternalSourcesUrl } from '../urls';

export interface ExternalSourcesApiService {
  create: (data: CreateExternalSourceData) => Promise<ExternalSourceResponse>;
  /** Deletes every external source and the connector each one created. */
  cleanUp: () => Promise<void>;
}

/**
 * Seeds external sources through the create route, which also creates their connectors, and
 * deletes them through the delete route so their connectors go too.
 */
export const getExternalSourcesApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): ExternalSourcesApiService => ({
  create: (data) =>
    measurePerformanceAsync(log, 'externalSources.create', async () => {
      const response = await kbnClient.request<ExternalSourceResponse>({
        method: 'POST',
        path: EXTERNAL_SOURCE_API_PATH,
        headers: COMMON_HEADERS,
        body: data,
      });
      return response.data;
    }),

  cleanUp: () =>
    measurePerformanceAsync(log, 'externalSources.cleanUp', async () => {
      const { data } = await kbnClient.request<FindExternalSourcesResponse>({
        method: 'GET',
        path: getListExternalSourcesUrl({ per_page: 100 }),
        headers: COMMON_HEADERS,
      });
      for (const { id } of data.items) {
        await kbnClient.request({
          method: 'DELETE',
          path: getExternalSourceUrl(id),
          headers: COMMON_HEADERS,
        });
      }
      // Removes any external source the delete route could not reach.
      await kbnClient.savedObjects.clean({ types: [EXTERNAL_SOURCE_SAVED_OBJECT_TYPE] });
    }),
});
