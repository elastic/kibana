/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES, FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import type { StreamDocsStat } from '../../../../common';
import { createServerRoute } from '../../create_server_route';
import { getAggregatedDatasetPaginatedResults } from './get_streams_aggregated_paginated_results';

const DATASET_TYPES = ['logs', 'metrics', 'traces', 'synthetics', 'profiling'] as const;

const docCountsQuerySchema = z.object({
  start: z.string(),
  end: z.string(),
  types: z.array(z.enum(DATASET_TYPES)),
  datasetQuery: z.string().optional(),
});

const degradedDocCountsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/doc_counts/degraded',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: docCountsQuerySchema,
  }),
  handler: async ({ params, getScopedClients, request }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    const { start, end, types, datasetQuery } = params.query;

    const indexPatterns = datasetQuery
      ? [datasetQuery]
      : types.map((type) => `${type}-*-*`);

    return await getAggregatedDatasetPaginatedResults({
      esClient,
      index: indexPatterns.join(','),
      start,
      end,
      query: {
        must: { exists: { field: '_ignored' } },
      },
    });
  },
});

const failedDocCountsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/doc_counts/failed',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: docCountsQuerySchema,
  }),
  handler: async ({ params, getScopedClients, request }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    const { start, end, types, datasetQuery } = params.query;

    const indexPatterns = datasetQuery
      ? [`${datasetQuery}${FAILURE_STORE_SELECTOR}`]
      : types.map((type) => `${type}-*-*${FAILURE_STORE_SELECTOR}`);

    return await getAggregatedDatasetPaginatedResults({
      esClient,
      index: indexPatterns.join(','),
      start,
      end,
    });
  },
});

const totalDocCountsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/doc_counts/total',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: docCountsQuerySchema,
  }),
  handler: async ({ params, getScopedClients, request }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    const { start, end, types, datasetQuery } = params.query;

    const indexPatterns = datasetQuery
      ? [datasetQuery]
      : types.map((type) => `${type}-*-*`);

    return await getAggregatedDatasetPaginatedResults({
      esClient,
      index: indexPatterns.join(','),
      start,
      end,
    });
  },
});

export const docCountsRoutes = {
  ...degradedDocCountsRoute,
  ...failedDocCountsRoute,
  ...totalDocCountsRoute,
};


