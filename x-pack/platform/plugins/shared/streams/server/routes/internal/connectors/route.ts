/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isSupportedConnector, type InferenceConnector } from '@kbn/inference-common';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';

export const INFERENCE_CONNECTOR_TYPE = '.inference';

/**
 * Minimal connector interface for filtering. Compatible with the connector
 * type returned by the actions plugin.
 */
export interface ConnectorWithConfig {
  id: string;
  actionTypeId: string;
  name: string;
  config?: Record<string, unknown>;
}

export async function inferenceEndpointExists(
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

/**
 * Filters connectors to only include supported GenAI connectors.
 * For .inference connectors, also validates that the inference endpoint exists.
 *
 * @param connectors - List of all connectors to filter
 * @param checkInferenceEndpointExists - Function to check if an inference endpoint exists
 * @returns List of supported connectors with validated inference endpoints
 */
export async function filterSupportedConnectors<T extends ConnectorWithConfig>(
  connectors: T[],
  checkInferenceEndpointExists: (inferenceId: string) => Promise<boolean>
): Promise<T[]> {
  // Filter to only supported GenAI connector types
  // Uses isSupportedConnector which also validates .inference connectors have taskType: 'chat_completion'
  const supportedConnectors = connectors.filter((connector) => isSupportedConnector(connector));

  // Validate inference connectors have endpoints
  const validatedConnectors = await Promise.all(
    supportedConnectors.map(async (connector) => {
      if (connector.actionTypeId === INFERENCE_CONNECTOR_TYPE) {
        const inferenceId = (connector.config as InferenceConnector['config'])?.inferenceId;
        if (inferenceId) {
          const exists = await checkInferenceEndpointExists(inferenceId);
          if (!exists) {
            return null;
          }
        }
      }
      return connector;
    })
  );

  // Type assertion is safe here - we're only filtering out nulls, the remaining values are T
  return validatedConnectors.filter((connector) => connector !== null) as T[];
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

    const filteredConnectors = await filterSupportedConnectors(connectors, (inferenceId) =>
      inferenceEndpointExists(scopedClusterClient.asCurrentUser, inferenceId)
    );

    return {
      connectors: filteredConnectors,
    };
  },
});

export const connectorRoutes = {
  ...getConnectorsRoute,
};
