/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { defaultInferenceEndpoints, InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';

// TODO: Import from gen-ai-settings-plugin (package) once available
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

const selectFallbackConnector = (connectors: InferenceConnector[]): string => {
  const defaultId = defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION;
  const defaultConnector = connectors.find((c) => c.connectorId === defaultId);
  if (defaultConnector) {
    return defaultConnector.connectorId;
  }

  const inferenceConnector = connectors.find((c) => c.type === InferenceConnectorType.Inference);
  if (inferenceConnector) {
    return inferenceConnector.connectorId;
  }

  const openAIConnector = connectors.find((c) => c.type === InferenceConnectorType.OpenAI);
  if (openAIConnector) {
    return openAIConnector.connectorId;
  }

  return connectors[0].connectorId;
};

const tryResolveFallbackConnector = async ({
  searchInferenceEndpoints,
  inference,
  request,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  inference: InferenceServerStart;
  request: KibanaRequest;
}): Promise<string | undefined> => {
  // First, try feature-registered endpoints (admin SO overrides or recommended endpoints)
  try {
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      AGENT_BUILDER_INFERENCE_FEATURE_ID,
      request
    );
    if (endpoints.length > 0) {
      return endpoints[0].connectorId;
    }
  } catch {
    // Ignore errors — fall through to connector list fallback
  }

  // Fall back to the full connector list, preferring the platform default
  try {
    const connectors = await inference.getConnectorList(request);
    if (connectors.length > 0) {
      return selectFallbackConnector(connectors);
    }
  } catch {
    // Ignore errors
  }

  return undefined;
};

export const resolveSelectedConnectorId = async ({
  uiSettings,
  savedObjects,
  request,
  connectorId,
  inference,
  searchInferenceEndpoints,
}: {
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  request: KibanaRequest;
  connectorId?: string;
  inference: InferenceServerStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}): Promise<string | undefined> => {
  const soClient = savedObjects.getScopedClient(request);
  const uiSettingsClient = uiSettings.asScopedToClient(soClient);

  const [defaultConnectorSetting, defaultConnectorOnly] = await Promise.all([
    uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR),
    uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY),
  ]);

  const hasValidDefaultConnector =
    defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR;

  if (defaultConnectorOnly && hasValidDefaultConnector) {
    if (connectorId && connectorId !== defaultConnectorSetting) {
      throw new Error(
        `Connector ID [${connectorId}] does not match the configured default connector ID [${defaultConnectorSetting}].`
      );
    }
    return defaultConnectorSetting;
  }
  if (connectorId) {
    return connectorId;
  }
  if (hasValidDefaultConnector) {
    return defaultConnectorSetting;
  }

  return tryResolveFallbackConnector({ searchInferenceEndpoints, inference, request });
};
