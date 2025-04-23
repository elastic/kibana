/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { SignificantEventsGetResponse } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { createServerRoute } from '../../create_server_route';
import { readSignificantEvents } from './read_significant_events';

export const readSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/significant_events 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({ from: z.coerce.date(), to: z.coerce.date(), bucketSize: z.string() }),
  }),

  options: {
    access: 'public',
    summary: 'Read the significant events',
    description: 'Read the significant events',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  handler: async ({ params, request, getScopedClients }): Promise<SignificantEventsGetResponse> => {
    const { streamsClient, assetClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams are not enabled');
    }

    const { name } = params.path;
    const { from, to, bucketSize } = params.query;

    return await readSignificantEvents(
      { name, from, to, bucketSize },
      { assetClient, scopedClusterClient }
    );
  },
});

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
};
