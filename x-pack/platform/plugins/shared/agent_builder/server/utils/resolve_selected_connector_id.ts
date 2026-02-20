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
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { PREFERRED_DEFAULT_CONNECTOR_ID } from '../../common/constants';

// TODO: Import from gen-ai-settings-plugin (package) once available
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

const selectDefaultConnector = ({ connectors }: { connectors: InferenceConnector[] }) => {
  const preferredConnector = connectors.find(
    (connector) => connector.connectorId === PREFERRED_DEFAULT_CONNECTOR_ID
  );
  if (preferredConnector) return preferredConnector;

  const inferenceConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.Inference
  );
  if (inferenceConnector) return inferenceConnector;

  const openAIConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.OpenAI
  );
  if (openAIConnector) return openAIConnector;

  return connectors[0];
};

const tryGetInferenceDefault = async (
  inference: InferenceServerStart,
  request: KibanaRequest
): Promise<string | undefined> => {
  try {
    const defaultConnector = await inference.getDefaultConnector(request);
    return defaultConnector.connectorId;
  } catch {
    return undefined;
  }
};

const tryGetFallbackConnector = async (
  inference: InferenceServerStart,
  request: KibanaRequest
): Promise<string | undefined> => {
  try {
    const connectors = await inference.getConnectorList(request);
    if (connectors.length > 0) {
      const fallbackConnector = selectDefaultConnector({ connectors });
      return fallbackConnector.connectorId;
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
}: {
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  request: KibanaRequest;
  connectorId?: string;
  inference: InferenceServerStart;
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
  if (connectorId) return connectorId;
  if (hasValidDefaultConnector) return defaultConnectorSetting;

  return (
    (await tryGetInferenceDefault(inference, request)) ||
    (await tryGetFallbackConnector(inference, request))
  );
};
