/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { InferenceConnector } from '@kbn/inference-common';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { resolveConnectorList, resolveConnectorById } from '../resolve_inference_connectors';

const listConnectorsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/connectors',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<InferenceConnector[]> => resolveConnectorList(resources),
});

const getConnectorByIdRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/connectors/{connectorId}',
  params: t.type({
    path: t.type({
      connectorId: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<InferenceConnector> =>
    resolveConnectorById({ ...resources, connectorId: resources.params.path.connectorId }),
});

export const connectorRoutes = {
  ...listConnectorsRoute,
  ...getConnectorByIdRoute,
};
