/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { InferenceConnector } from '@kbn/inference-common';
import { OBSERVABILITY_AI_ASSISTANT_SUBFEATURE_ID } from '../../../common/feature';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const listConnectorsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/connectors',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<InferenceConnector[]> => {
    const { request, plugins, logger } = resources;

    const searchInferenceEndpoints = await plugins.searchInferenceEndpoints.start();
    const resolved = await searchInferenceEndpoints.endpoints.getForFeature(
      OBSERVABILITY_AI_ASSISTANT_SUBFEATURE_ID,
      request
    );
    resolved.warnings.forEach((w) => logger.warn(w));

    return resolved.endpoints;
  },
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
  handler: async (resources): Promise<InferenceConnector> => {
    const { request, plugins, params } = resources;
    const inferenceStart = await plugins.inference.start();
    return inferenceStart.getConnectorById(params.path.connectorId, request);
  },
});

export const connectorRoutes = {
  ...listConnectorsRoute,
  ...getConnectorByIdRoute,
};
