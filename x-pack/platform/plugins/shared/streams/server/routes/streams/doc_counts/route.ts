/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import type { StreamDocsStat } from '../../../../common';
import { createServerRoute } from '../../create_server_route';
import { getDegradedDocCountsForStreams, getDocCountsForStreams } from './get_streams_doc_counts';

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
  handler: async ({ getScopedClients, request, context }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;
    const coreContext = await context.core;
    const esClientAsSecondaryAuthUser = coreContext.elasticsearch.client.asSecondaryAuthUser;

    const streams = await streamsClient.listStreams();
    const streamNames = streams
      .filter((stream) => stream.name !== 'logs') // Exclude root stream to avoid double counting over all child streams
      .map((stream) => stream.name);

    return await getDegradedDocCountsForStreams({
      esClient,
      streamNames,
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
  handler: async ({ getScopedClients, request }): Promise<StreamDocsStat[]> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    // Fetch all streams server-side
    const streams = await streamsClient.listStreams();
    const streamNames = streams
      .filter((stream) => stream.name !== 'logs') // Exclude root stream to avoid double counting over all child streams
      .map((stream) => stream.name);

    return await getDocCountsForStreams({
      esClient: scopedClusterClient.asCurrentUser,
      esClientAsSecondaryAuthUser: scopedClusterClient.asSecondaryAuthUser,
      streamNames,
    });
  },
});

export const docCountsRoutes = {
  ...degradedDocCountsRoute,
  ...totalDocCountsRoute,
};
