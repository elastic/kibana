/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { InferenceConnector } from '@kbn/inference-common';
import { MODEL_SETTINGS_FEATURE_FLAG_ID } from '@kbn/search-inference-endpoints/common/constants';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import {
  loadObservabilityAssistantModelSettingsEndpoints,
  selectInferenceConnectorByIdFromModelSettings,
  selectInferenceConnectorListFromModelSettings,
} from '../chat/resolve_inference_connector_id';

const listConnectorsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/connectors',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<InferenceConnector[]> => {
    const { request, plugins, logger, context } = resources;
    const modelSettingsEnabled = await (
      await context.core
    ).uiSettings.client.get<boolean>(MODEL_SETTINGS_FEATURE_FLAG_ID);
    const featureEndpoints = modelSettingsEnabled
      ? await loadObservabilityAssistantModelSettingsEndpoints({
          plugins,
          request,
          logger,
        })
      : null;
    const fromModelSettings = selectInferenceConnectorListFromModelSettings(featureEndpoints);
    if (fromModelSettings) {
      return fromModelSettings;
    }

    const inferenceStart = await plugins.inference.start();
    return inferenceStart.getConnectorList(request);
  },
});

/**
 * When Model Settings has a non-empty allow-list for Observability AI Assistant, connectors are
 * limited to that list. If the list is empty and the feature was never saved in Model Settings
 * (`soEntryFound` false), falls back to the inference plugin (same as listing all connectors).
 * A disallowed `connectorId` when the list is non-empty yields **404** for this GET route.
 */
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
    const { request, plugins, params, logger, context } = resources;
    const modelSettingsEnabled = await (
      await context.core
    ).uiSettings.client.get<boolean>(MODEL_SETTINGS_FEATURE_FLAG_ID);
    const featureEndpoints = modelSettingsEnabled
      ? await loadObservabilityAssistantModelSettingsEndpoints({
          plugins,
          request,
          logger,
        })
      : null;
    const fromModelSettings = selectInferenceConnectorByIdFromModelSettings(
      featureEndpoints,
      params.path.connectorId
    );
    if (fromModelSettings) {
      return fromModelSettings;
    }

    const inferenceStart = await plugins.inference.start();
    return inferenceStart.getConnectorById(params.path.connectorId, request);
  },
});

export const connectorRoutes = {
  ...listConnectorsRoute,
  ...getConnectorByIdRoute,
};
