/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { ApiInferenceConnector, InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { NO_DEFAULT_MODEL } from '../../common/constants';
import { mergeConnectors } from './merge_connectors';
import type { GetForFeatureOptions, ResolvedInferenceEndpoints } from '../types';

export const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

// The Models settings page stores `NO_DEFAULT_MODEL` for "No default model", while `NO_DEFAULT_CONNECTOR`
// is the value the default AI connector setting has historically held for no default.
export const isDefaultSet = (
  defaultConnectorId: string | undefined
): defaultConnectorId is string =>
  !!defaultConnectorId &&
  defaultConnectorId !== NO_DEFAULT_CONNECTOR &&
  defaultConnectorId !== NO_DEFAULT_MODEL;

export interface ResolvedConnectorsForFeature {
  connectors: ApiInferenceConnector[];
  warnings: string[];
  soEntryFound: boolean;
}

/**
 * Resolves the full, ordered model list for a feature.
 *
 * The priority resolution is:
 *   - If the default only setting is enabled, return just the default connector without feature-declared parameters (or nothing if not set).
 *   - If `opts.onlyReturnConfigured` is true, return only the explicitly configured endpoints
 *     (SO override or recommendedEndpoints) without prepending the global default or the full
 *     connector catalog. An empty list signals "nothing explicitly configured".
 *   - If there's a saved object entry for the feature, return that list.
 *   - If `ignoreGlobalDefault` is true, skip prepending the global default connector.
 *   - If there's a global default, return that and the feature-recommended models with isRecommended set to true, followed by the rest of the available models.
 *   - If there's no global default, return the feature-recommended models with isRecommended set to true, followed by the rest of the available models.
 *   - If there are no recommended models and no global default, return the full list of available models.
 *
 * Used by both the `GET /internal/search_inference_endpoints/connectors`
 * HTTP endpoint and the `endpoints.getForFeature` server-side contract.
 *
 * @param getForFeature  Resolves feature-specific endpoints (without the global default).
 * @param getConnectorList  Returns the full connector catalog (not called when `opts.onlyReturnConfigured` is true).
 * @param getConnectorById  Fetches a single connector by ID (used for the global default).
 * @param uiSettingsClient  Scoped UI-settings client to read the default connector setting.
 * @param featureId  The feature to resolve connectors for.
 * @param opts  Optional resolution options (see {@link GetForFeatureOptions}).
 * @param logger  Logger for warnings/errors.
 */
export const resolveModelsForFeature = async ({
  getForFeature,
  getConnectorList,
  getConnectorById,
  uiSettingsClient,
  featureId,
  ignoreGlobalDefault = false,
  opts,
  logger,
}: {
  getForFeature: (featureId: string) => Promise<ResolvedInferenceEndpoints>;
  getConnectorList: () => Promise<InferenceConnector[]>;
  getConnectorById: (id: string) => Promise<InferenceConnector>;
  uiSettingsClient: IUiSettingsClient;
  featureId: string;
  ignoreGlobalDefault?: boolean;
  opts?: GetForFeatureOptions;
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

  const getFeatureEndpoints = () =>
    getForFeature(featureId).catch((e): ResolvedInferenceEndpoints => {
      logger.error(`Failed to resolve endpoints for feature "${featureId}": ${e.message}`);
      return { endpoints: [], warnings: [], soEntryFound: false };
    });

  if (defaultConnectorOnly) {
    if (!isDefaultSet(defaultConnectorId)) {
      return { connectors: [], warnings: [], soEntryFound: false };
    }
    const connector = await fetchConnectorById(defaultConnectorId);
    return {
      connectors: connector ? [{ ...connector, isDefault: true }] : [],
      warnings: [],
      soEntryFound: false,
    };
  }

  if (opts?.onlyReturnConfigured) {
    const featureResult = await getFeatureEndpoints();
    const { soEntryFound } = featureResult;
    return {
      connectors: soEntryFound
        ? featureResult.endpoints
        : featureResult.endpoints.map((e) => ({ ...e, isRecommended: true })),
      warnings: featureResult.warnings,
      soEntryFound,
    };
  }

  const [featureResult, allConnectors] = await Promise.all([
    getFeatureEndpoints(),
    getConnectorList().catch((e): InferenceConnector[] => {
      logger.error(`Failed to load connector list: ${e.message}`);
      return [];
    }),
  ]);

  const { soEntryFound } = featureResult;
  const merged = mergeConnectors(featureResult.endpoints, allConnectors, soEntryFound);

  let connectors: ApiInferenceConnector[] = merged;
  if (!soEntryFound && !ignoreGlobalDefault && isDefaultSet(defaultConnectorId)) {
    const defaultConnector = await fetchConnectorById(defaultConnectorId);
    if (defaultConnector) {
      // The setting may hold a stack connector alias of an inference endpoint, in which case the
      // feature declares its parameters under the endpoint id (`defaultConnector.connectorId`).
      const parameters = featureResult.endpoints.find(
        ({ connectorId }) =>
          connectorId === defaultConnectorId || connectorId === defaultConnector.connectorId
      )?.parameters;
      // An alias default replaces the endpoint's own merged entry, which used to stay in the list
      // with its recommended flag, so carry the flag over.
      const isAlias = defaultConnector.connectorId !== defaultConnectorId;
      const isRecommended = isAlias
        ? merged.find((c) => c.connectorId === defaultConnector.connectorId)?.isRecommended
        : undefined;
      connectors = [
        {
          ...defaultConnector,
          ...(parameters ? { parameters } : {}),
          ...(isRecommended ? { isRecommended } : {}),
          isDefault: true,
        },
        ...merged.filter(
          (c) =>
            c.connectorId !== defaultConnectorId && c.connectorId !== defaultConnector.connectorId
        ),
      ];
    }
  }

  if (
    soEntryFound &&
    !ignoreGlobalDefault &&
    isDefaultSet(defaultConnectorId) &&
    connectors.length > 0
  ) {
    // A saved override replaces the list, so the default is not added to it. Still flag the
    // entry the default setting resolves to when the override already contains it. An exact id
    // match is flagged from the list in memory. A setting that is a known connector id the
    // override left out has nothing to flag. Only a setting that matches no known id may be a
    // stack connector alias of an endpoint, which needs a lookup to resolve.
    let defaultEntryId = connectors.some((c) => c.connectorId === defaultConnectorId)
      ? defaultConnectorId
      : undefined;
    const isKnownConnectorId = allConnectors.some((c) => c.connectorId === defaultConnectorId);
    if (!defaultEntryId && !isKnownConnectorId) {
      defaultEntryId = (await fetchConnectorById(defaultConnectorId))?.connectorId;
    }
    if (defaultEntryId) {
      connectors = connectors.map((c) =>
        c.connectorId === defaultEntryId ? { ...c, isDefault: true } : c
      );
    }
  }

  return { connectors, warnings: featureResult.warnings, soEntryFound };
};
