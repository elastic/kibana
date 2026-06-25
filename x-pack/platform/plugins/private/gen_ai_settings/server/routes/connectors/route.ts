/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { InferenceConnector } from '@kbn/inference-common';
import { createGenAiSettingsServerRoute } from '../create_gen_ai_settings_server_route';

const listConnectorsRoute = createGenAiSettingsServerRoute({
  endpoint: 'GET /internal/gen_ai_settings/connectors',
  security: {
    authz: {
      enabled: false,
      reason: 'The route is protected by the actions plugin',
    },
  },
  handler: async (resources): Promise<InferenceConnector[]> => {
    const { request, plugins } = resources;

    const inferenceStart = await plugins.inference.start();

    return inferenceStart.getConnectorList(request);
  },
});

const getConnectorByIdRoute = createGenAiSettingsServerRoute({
  endpoint: 'GET /internal/gen_ai_settings/connectors/{connectorId}',
  security: {
    authz: {
      enabled: false,
      reason: 'The route is protected by the actions plugin',
    },
  },
  params: z.object({
    path: z.object({ connectorId: z.string() }),
  }),
  handler: async (resources): Promise<InferenceConnector> => {
    const { request, params, plugins } = resources;

    const inferenceStart = await plugins.inference.start();

    return inferenceStart.getConnectorById(params.path.connectorId, request);
  },
});

export const connectorRoutes = {
  ...listConnectorsRoute,
  ...getConnectorByIdRoute,
};
