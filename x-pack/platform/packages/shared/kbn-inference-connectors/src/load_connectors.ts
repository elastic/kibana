/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';
import { isOpenAiProviderType } from './openai_provider_type_guard';
import type { AIConnector } from './types';

type InferenceConnectorFromApi = InferenceConnector & { isRecommended?: boolean };

export const toAIConnector = (connector: InferenceConnectorFromApi): AIConnector => ({
  id: connector.connectorId,
  name: connector.name,
  actionTypeId: connector.type,
  config: connector.config,
  secrets: {},
  isPreconfigured: connector.isPreconfigured,
  isSystemAction: false,
  isDeprecated: connector.isDeprecated ?? false,
  isConnectorTypeDeprecated: connector.isConnectorTypeDeprecated ?? false,
  isMissingSecrets: connector.isMissingSecrets ?? false,
  isRecommended: connector.isRecommended,
  apiProvider:
    !connector.isPreconfigured &&
    connector.config?.apiProvider !== undefined &&
    isOpenAiProviderType(connector.config.apiProvider)
      ? connector.config.apiProvider
      : undefined,
});

export const applyConnectorSettings = <T extends { id: string }>(
  allConnectors: T[],
  settings: SettingsStart
): T[] => {
  const defaultConnectorId = settings.client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const defaultConnectorOnly = settings.client.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  if (defaultConnectorOnly && defaultConnectorId) {
    const connector = allConnectors.find((c) => c.id === defaultConnectorId);
    return connector ? [connector] : allConnectors;
  }
  return allConnectors;
};

/**
 * Fetches AI connectors for a given feature, maps them to {@link AIConnector},
 * and applies the default-connector UI settings filter.
 */
export const loadConnectors = async ({
  http,
  featureId,
  settings,
}: {
  http: HttpSetup;
  featureId: string;
  settings: SettingsStart;
}): Promise<AIConnector[]> => {
  const { connectors } = await fetchConnectorsForFeature(http, featureId);
  const aiConnectors = connectors.map(toAIConnector);
  return applyConnectorSettings(aiConnectors, settings);
};
