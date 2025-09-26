/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { InferenceConnectorType, isSupportedConnector } from '@kbn/inference-common';
import { inferenceEndpointExists } from '@kbn/inference-endpoint-plugin/server/lib/inference_endpoint_exists';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const listConnectorsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/connectors',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<FindActionResult[]> => {
    const { request, plugins, context } = resources;
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    const actionsClient = await (
      await plugins.actions.start()
    ).getActionsClientWithRequest(request);

    const [availableTypes, connectors] = await Promise.all([
      actionsClient
        .listTypes({
          includeSystemActionTypes: false,
        })
        .then((types) =>
          types
            .filter((type) => type.enabled && type.enabledInLicense && type.enabledInConfig)
            .map((type) => type.id)
        ),
      actionsClient.getAll(),
    ]);
    return connectors.filter(async (connector) => {
      if (connector.actionTypeId === InferenceConnectorType.Inference) {
        const isInferenceEndpointExists = await inferenceEndpointExists(
          esClient,
          connector?.config?.inferenceId
        );
        return (
          availableTypes.includes(connector.actionTypeId) &&
          isSupportedConnector(connector) &&
          isInferenceEndpointExists
        );
      }
      return availableTypes.includes(connector.actionTypeId) && isSupportedConnector(connector);
    });
  },
});

export const connectorRoutes = {
  ...listConnectorsRoute,
};
