/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import type { StreamsGraph } from '@kbn/streams-schema';
import { streamsGraphUpsertRequestSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { StreamsGraphService } from '../../../lib/saved_objects/streams_graph_service';
import { createServerRoute } from '../../create_server_route';

const assertStreamsCanvasEnabled = async (uiSettingsClient: {
  get: (key: string) => Promise<unknown>;
}) => {
  const canvasEnabled = await uiSettingsClient.get(OBSERVABILITY_STREAMS_ENABLE_CANVAS);

  if (!canvasEnabled) {
    throw notFound('Streams graph API is not enabled.');
  }
};

export const getStreamsGraphRoute = createServerRoute({
  endpoint: 'GET /internal/streams/graph',
  options: {
    access: 'internal',
    summary: 'Get the Streams graph',
    description: 'Fetches the canonical Streams graph configuration and UI metadata.',
    availability: {
      since: '9.5.0',
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients, logger }): Promise<StreamsGraph.GetResponse> => {
    const { soClient, uiSettingsClient } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const streamsGraphService = new StreamsGraphService({
      soClient,
      logger,
    });

    return await streamsGraphService.getGraph();
  },
});

export const putStreamsGraphRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/graph',
  options: {
    access: 'internal',
    summary: 'Create or update the Streams graph',
    description: 'Stores the canonical Streams graph configuration and associated UI metadata.',
    availability: {
      since: '9.5.0',
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: streamsGraphUpsertRequestSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<{ acknowledged: true }> => {
    const { soClient, uiSettingsClient } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const streamsGraphService = new StreamsGraphService({
      soClient,
      logger,
    });

    await streamsGraphService.upsertGraph(params.body as StreamsGraph.UpsertRequest);

    return { acknowledged: true };
  },
});

export const graphRoutes = {
  ...getStreamsGraphRoute,
  ...putStreamsGraphRoute,
};
