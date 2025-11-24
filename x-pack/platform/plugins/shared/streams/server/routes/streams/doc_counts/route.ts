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
import { getDocCountsForStreams } from './get_streams_doc_counts';

const docCountsQuerySchema = z.object({
  start: z.string(),
  end: z.string(),
  streams: z.string().optional(),
});

const degradedDocCountsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/doc_counts/degraded',
  options: {
    access: 'internal',
  },
  params: z.object({
    query: docCountsQuerySchema,
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, getScopedClients, request }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    const { start, end, streams } = params.query;

    const streamNames = streams ? streams.split(',') : [];

    return await getDocCountsForStreams({
      esClient,
      streamNames,
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
  params: z.object({
    query: docCountsQuerySchema,
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, getScopedClients, request }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    const { start, end, streams } = params.query;

    const streamNames = streams
      ? streams.split(',').map((stream) => `${stream}${FAILURE_STORE_SELECTOR}`)
      : [];

    const results = await getDocCountsForStreams({
      esClient,
      streamNames,
      start,
      end,
    });

    // Strip the ::failures suffix from stream names so they match the base stream names
    return results.map((result) => ({
      ...result,
      stream: result.stream.replace(FAILURE_STORE_SELECTOR, ''),
    }));
  },
});

const totalDocCountsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/doc_counts/total',
  options: {
    access: 'internal',
  },
  params: z.object({
    query: docCountsQuerySchema,
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, getScopedClients, request }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    const { start, end, streams } = params.query;

    const streamNames = streams ? streams.split(',') : [];

    return await getDocCountsForStreams({
      esClient,
      streamNames,
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
