/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import type { StreamDocsStat } from '../../../../common';
import { createServerRoute } from '../../create_server_route';
import {
  getDegradedDocCountsForStreams,
  getDocCountsForStreams,
  getFailedDocCountsForStreams,
} from './get_streams_doc_counts';

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
    query: z
      .object({
        stream: z.string().optional(),
      })
      .optional(),
  }),
  handler: async ({ getScopedClients, request, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;
    const streamName = params?.query?.stream;

    return await getDegradedDocCountsForStreams({
      esClient,
      streamName,
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
    query: z
      .object({
        stream: z.string().optional(),
      })
      .optional(),
  }),
  handler: async ({ getScopedClients, request, server, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const streamName = params?.query?.stream;

    return await getDocCountsForStreams({
      isServerless: server.isServerless,
      esClient: scopedClusterClient.asCurrentUser,
      esClientAsSecondaryAuthUser: scopedClusterClient.asSecondaryAuthUser,
      streamName,
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
    query: z.object({
      start: z.coerce.number(),
      end: z.coerce.number(),
      stream: z.string().optional(),
    }),
  }),
  handler: async ({ getScopedClients, request, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;
    const { start, end, stream } = params.query;

    return await getFailedDocCountsForStreams({
      esClient,
      start,
      end,
      streamName: stream,
    });
  },
});

export const docCountsRoutes = {
  ...degradedDocCountsRoute,
  ...totalDocCountsRoute,
  ...failedDocCountsRoute,
};
