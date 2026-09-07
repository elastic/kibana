/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';

export const getConnectorByIdRoute = createServerRoute({
  endpoint: 'GET /internal/streams/connectors/{connectorId}',
  options: {
    access: 'internal',
    summary: 'Get a GenAI connector by ID',
    description: 'Fetches a single GenAI connector by its ID',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ connectorId: z.string() }),
  }),
  handler: async ({ request, params, server }) => {
    return server.inference.getConnectorById(params.path.connectorId, request);
  },
});

export const connectorRoutes = {
  ...getConnectorByIdRoute,
};
