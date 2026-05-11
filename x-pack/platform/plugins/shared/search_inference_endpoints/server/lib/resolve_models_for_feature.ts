/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { mergeConnectors, type ApiInferenceConnector } from './merge_connectors';
import type { ResolvedInferenceEndpoints } from '../types';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export interface ResolvedConnectorsForFeature {
  connectors: ApiInferenceConnector[];
  warnings: string[];
  soEntryFound: boolean;
}

/**
 * Resolves the full, ordered model list for a feature.
 *
 * The priority resolution is:
 *   - If the default only setting is enabled, return just the default connector (or nothing if not set).
 *   - If there's a saved object entry for the feature, return that list
 *   - If there's a global default, return that and the feature-recommended models with isRecommended set to true, followed by the rest of the available models
 *   - If there's no global default, return the feature-recommended models with isRecommended set to true, followed by the rest of the available models
 *   - If there are no recommended models and no global default, return the full list of available models
 *
 * Used by both the `GET /internal/search_inference_endpoints/connectors`
 * HTTP endpoint and the `endpoints.getForFeature` server-side contract.
 *
 * @param getForFeature  Resolves feature-specific endpoints (without the global default).
 * @param getConnectorList  Returns the full connector catalog.
 * @param getConnectorById  Fetches a single connector by ID (used for the global default).
 * @param uiSettingsClient  Scoped UI-settings client to read the default connector setting.
 * @param featureId  The feature to resolve connectors for.
 * @param logger  Logger for warnings/errors.
 */
export const resolveModelsForFeature = async ({
  getForFeature,
  getConnectorList,
  getConnectorById,
  uiSettingsClient,
  featureId,
  logger,
}: {
  getForFeature: (featureId: string) => Promise<ResolvedInferenceEndpoints>;
  getConnectorList: () => Promise<InferenceConnector[]>;
  getConnectorById: (id: string) => Promise<InferenceConnector>;
  uiSettingsClient: IUiSettingsClient;
  featureId: string;
  logger: Logger;
}): Promise<ResolvedConnectorsForFeature> => {
  const [defaultConnectorId, defaultConnectorOnly] = await Promise.all([
    uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR),
    uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY),
  ]);

  const fetchConnectorById = async (id: string): Promise<InferenceConnector | undefined> => {
    try {
      return await getConnectorById(id);
    } catch (e) {
      logger.warn(`Failed to load default connector "${id}": ${e.message}`);
      return undefined;
    }
  };

  if (defaultConnectorOnly) {
    if (!defaultConnectorId || defaultConnectorId === NO_DEFAULT_CONNECTOR) {
      return { connectors: [], warnings: [], soEntryFound: false };
    }
    const connector = await fetchConnectorById(defaultConnectorId);
    return {
      connectors: connector ? [connector] : [],
      warnings: [],
      soEntryFound: false,
    };
  }

  const [featureResult, allConnectors] = await Promise.all([
    getForFeature(featureId).catch((e): ResolvedInferenceEndpoints => {
      logger.error(`Failed to resolve endpoints for feature "${featureId}": ${e.message}`);
      return { endpoints: [], warnings: [], soEntryFound: false };
    }),
    getConnectorList().catch((e): InferenceConnector[] => {
      logger.error(`Failed to load connector list: ${e.message}`);
      return [];
    }),
  ]);

  const { soEntryFound } = featureResult;
  const merged = mergeConnectors(featureResult.endpoints, allConnectors, soEntryFound);

  let connectors: ApiInferenceConnector[] = merged;
  if (!soEntryFound && defaultConnectorId && defaultConnectorId !== NO_DEFAULT_CONNECTOR) {
    const defaultConnector = await fetchConnectorById(defaultConnectorId);
    if (defaultConnector) {
      connectors = [
        defaultConnector,
        ...merged.filter((c) => c.connectorId !== defaultConnectorId),
      ];
    }
  }

  return { connectors, warnings: featureResult.warnings, soEntryFound };
};
