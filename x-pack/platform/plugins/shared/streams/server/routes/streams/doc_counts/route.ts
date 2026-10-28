/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import type { StreamDocsStat } from '../../../../common';
import { createServerRoute } from '../../create_server_route';
import {
  getDegradedDocCountsForStreams,
  getDocCountsForStreams,
  getFailedDocCountsForStreams,
  getIngestionDocCountsForStreams,
} from './get_streams_doc_counts';
import { statsStreamNamesBodySchema, statsStreamNamesTimeRangeBodySchema } from './utils';

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
        stream: z.string().max(MAX_STREAM_NAME_LENGTH).optional(),
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

const degradedDocCountsForStreamsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/doc_counts/degraded',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: statsStreamNamesBodySchema,
  }),
  handler: async ({ getScopedClients, request, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });

    return await getDegradedDocCountsForStreams({
      esClient: scopedClusterClient.asCurrentUser,
      streamNames: params.body.streams,
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
        stream: z.string().max(MAX_STREAM_NAME_LENGTH).optional(),
      })
      .optional(),
  }),
  handler: async ({ getScopedClients, request, server, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    const streamName = params?.query?.stream;

    return await getDocCountsForStreams({
      isServerless: server.isServerless,
      esClient: scopedClusterClient.asCurrentUser,
      esClientAsSecondaryAuthUser: isSecurityEnabled
        ? scopedClusterClient.asSecondaryAuthUser
        : undefined,
      streamName,
    });
  },
});

const totalDocCountsForStreamsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/doc_counts/total',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: statsStreamNamesBodySchema,
  }),
  handler: async ({ getScopedClients, request, server, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });

    return await getDocCountsForStreams({
      isServerless: server.isServerless,
      esClient: scopedClusterClient.asCurrentUser,
      esClientAsSecondaryAuthUser: isSecurityEnabled
        ? scopedClusterClient.asSecondaryAuthUser
        : undefined,
      streamNames: params.body.streams,
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
      stream: z.string().max(MAX_STREAM_NAME_LENGTH).optional(),
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

const failedDocCountsForStreamsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/doc_counts/failed',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: statsStreamNamesTimeRangeBodySchema,
  }),
  handler: async ({ getScopedClients, request, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const { start, end, streams } = params.body;

    return await getFailedDocCountsForStreams({
      esClient: scopedClusterClient.asCurrentUser,
      start,
      end,
      streamNames: streams,
    });
  },
});

const ingestionDocCountsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/doc_counts/ingestion',
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
      stream: z.string().max(MAX_STREAM_NAME_LENGTH).optional(),
    }),
  }),
  handler: async ({ getScopedClients, request, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;
    const { start, end, stream } = params.query;

    return await getIngestionDocCountsForStreams({
      esClient,
      streamsClient,
      start,
      end,
      streamName: stream,
    });
  },
});

const ingestionDocCountsForStreamsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/doc_counts/ingestion',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: statsStreamNamesTimeRangeBodySchema,
  }),
  handler: async ({ getScopedClients, request, params }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const { start, end, streams } = params.body;

    return await getIngestionDocCountsForStreams({
      esClient: scopedClusterClient.asCurrentUser,
      streamsClient,
      start,
      end,
      streamNames: streams,
    });
  },
});

export const docCountsRoutes = {
  ...degradedDocCountsRoute,
  ...degradedDocCountsForStreamsRoute,
  ...totalDocCountsRoute,
  ...totalDocCountsForStreamsRoute,
  ...failedDocCountsRoute,
  ...failedDocCountsForStreamsRoute,
  ...ingestionDocCountsRoute,
  ...ingestionDocCountsForStreamsRoute,
};
