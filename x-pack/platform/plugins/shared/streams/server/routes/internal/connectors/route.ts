/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isSupportedConnectorType, type InferenceConnector } from '@kbn/inference-common';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';

const INFERENCE_CONNECTOR_TYPE = '.inference';

async function inferenceEndpointExists(
  esClient: ElasticsearchClient,
  inferenceId: string
): Promise<boolean> {
  try {
    const endpoints = await esClient.inference.get({ inference_id: inferenceId });
    return endpoints.endpoints.some((endpoint) => endpoint.inference_id === inferenceId);
  } catch (error) {
    return false;
  }
}

export const getConnectorsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/connectors',
  options: {
    access: 'internal',
    summary: 'Get GenAI connectors',
    description: 'Fetches all available GenAI connectors for AI features',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, server }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    // Get actions client with request
    const actionsClient = await server.actions.getActionsClientWithRequest(request);

    if (!actionsClient) {
      throw new Error('Actions client not available');
    }

    const connectors = await actionsClient.getAll();

    // Filter to only supported GenAI connector types
    const supportedConnectors = connectors.filter((connector) =>
      isSupportedConnectorType(connector.actionTypeId)
    );

    // Validate inference connectors have endpoints
    const validatedConnectors = await Promise.all(
      supportedConnectors.map(async (connector) => {
        if (connector.actionTypeId === INFERENCE_CONNECTOR_TYPE) {
          const inferenceId = (connector.config as InferenceConnector['config'])?.inferenceId;
          if (inferenceId) {
            const exists = await inferenceEndpointExists(
              scopedClusterClient.asCurrentUser,
              inferenceId
            );
            if (!exists) {
              return null;
            }
          }
        }
        return connector;
      })
    );

    const filteredConnectors = validatedConnectors.filter(
      (connector): connector is NonNullable<typeof connector> => connector !== null
    );

    return {
      connectors: filteredConnectors,
    };
  },
});

export const connectorRoutes = {
  ...getConnectorsRoute,
};
