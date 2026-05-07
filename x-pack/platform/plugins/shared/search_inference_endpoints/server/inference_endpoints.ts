/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { type InferenceConnector, defaultInferenceEndpoints } from '@kbn/inference-common';
import { INFERENCE_SETTINGS_SO_TYPE, INFERENCE_SETTINGS_ID } from '../common/constants';
import type { InferenceSettingsAttributes } from '../common/types';
import type { InferenceFeatureRegistry } from './inference_feature_registry';
import type { ResolvedInferenceEndpoints } from './types';

/**
 * Returns the resolved inference endpoints for a feature.
 * Walks the fallback chain (admin SO override → recommendedEndpoints → parent feature)
 * and fetches the matching connectors by ID.
 *
 * @param registry - The feature registry to look up feature configs.
 * @param soClient - A scoped saved objects client.
 * @param getConnectorById - Function that returns a connector by ID.
 * @param featureId - The feature to resolve endpoints for.
 * @param logger - Logger instance for warnings.
 */
export const getForFeature = async (
  registry: InferenceFeatureRegistry,
  soClient: SavedObjectsClientContract,
  getConnectorById: (id: string) => Promise<InferenceConnector>,
  featureId: string,
  logger: Logger
): Promise<ResolvedInferenceEndpoints> => {
  const {
    ids,
    warnings: resolveWarnings,
    soEntryFound,
  } = await resolveEndpointIds(registry, soClient, featureId, logger);
  if (ids.length === 0) {
    return { endpoints: [], warnings: resolveWarnings, soEntryFound };
  }
  const result = await fetchConnectorsByIds(getConnectorById, ids);
  return {
    endpoints: result.endpoints,
    warnings: [...resolveWarnings, ...result.warnings],
    soEntryFound,
  };
};

/**
 * Fetches connectors by their IDs using getConnectorById.
 * Returns warnings for any IDs that were not found.
 */
const fetchConnectorsByIds = async (
  getConnectorById: (id: string) => Promise<InferenceConnector>,
  ids: string[]
): Promise<Omit<ResolvedInferenceEndpoints, 'soEntryFound'>> => {
  const endpoints: InferenceConnector[] = [];
  const warnings: string[] = [];

  for (const id of ids) {
    try {
      const connector = await getConnectorById(id);
      endpoints.push(connector);
    } catch (e) {
      warnings.push(
        i18n.translate('xpack.searchInferenceEndpoints.endpoints.endpointNotFound', {
          defaultMessage: 'Inference endpoint "{endpointId}" was not found in Elasticsearch.',
          values: { endpointId: id },
        })
      );
    }
  }

  return { endpoints, warnings };
};

interface ResolvedEndpointIds {
  ids: string[];
  warnings: string[];
  /** True when an SO entry was found for the feature (even if it had an empty endpoints list). */
  soEntryFound: boolean;
}

/**
 * Pure resolution logic that walks the fallback chain for a feature using
 * pre-fetched data. Exported so the settings route can reuse it without
 * re-reading the saved object.
 *
 * Fallback order:
 * 1. Admin-configured SO override for the feature itself
 * 2. Walk parentFeatureId chain, checking SO overrides at each level
 * 3. First non-empty recommendedEndpoints found in the chain
 * 4. Kibana default chat-completion endpoint
 */
export const resolveFeatureEndpointIds = (
  registry: InferenceFeatureRegistry,
  soFeaturesMap: Map<string, InferenceSettingsAttributes['features'][number]>,
  featureId: string,
  logger: Logger
): ResolvedEndpointIds => {
  let current = registry.get(featureId);
  if (!current) {
    logger.warn(
      i18n.translate('xpack.searchInferenceEndpoints.endpoints.featureNotFound', {
        defaultMessage: 'Feature with id "{featureId}" is not registered.',
        values: { featureId },
      })
    );
    return { ids: [], warnings: [], soEntryFound: false };
  }
  let recEntry = current.recommendedEndpoints?.length
    ? { featureId: current.featureId, recommendedEndpoints: current.recommendedEndpoints }
    : undefined;

  // Walk the fallback chain for the feature:
  // 1. Check for an admin-configured SO override for the current feature
  // 2. Follow the parentFeatureId link and repeat
  // 3. Fall back to the feature's recommendedEndpoints
  // The visited set prevents infinite loops from circular parent references.
  const visited = new Set<string>();
  let currentId = featureId;

  const initialSoEntry = soFeaturesMap.get(currentId);
  if (initialSoEntry && initialSoEntry.endpoints.length > 0) {
    return {
      ids: initialSoEntry.endpoints.map((e) => e.id),
      warnings: [],
      soEntryFound: true,
    };
  }
  if (initialSoEntry && initialSoEntry.endpoints.length === 0) {
    return { ids: [], warnings: [], soEntryFound: true };
  }

  visited.add(currentId);
  if (current.parentFeatureId) {
    currentId = current?.parentFeatureId;

    while (true) {
      if (visited.has(currentId)) {
        return {
          ids: [],
          warnings: [
            i18n.translate('xpack.searchInferenceEndpoints.endpoints.cyclicDependency', {
              defaultMessage:
                'Cyclic dependency detected in feature fallback chain: "{featureId}" references back to "{currentId}".',
              values: { featureId, currentId },
            }),
          ],
          soEntryFound: false,
        };
      }

      visited.add(currentId);
      current = registry.get(currentId);
      if (!current) {
        break;
      }
      if (!recEntry && current.recommendedEndpoints.length) {
        recEntry = {
          featureId: current.featureId,
          recommendedEndpoints: current.recommendedEndpoints,
        };
      }

      const soEntry = soFeaturesMap.get(currentId);
      if (soEntry && soEntry.endpoints.length > 0) {
        return {
          ids: soEntry.endpoints.map((e) => e.id),
          warnings: [],
          soEntryFound: true,
        };
      }
      if (soEntry && soEntry.endpoints.length === 0) {
        return { ids: [], warnings: [], soEntryFound: true };
      }

      if (current.parentFeatureId) {
        currentId = current.parentFeatureId;
      } else {
        break;
      }
    }
  }

  return {
    ids: recEntry?.recommendedEndpoints ?? [
      defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION,
    ],
    warnings: [],
    soEntryFound: false,
  };
};

const resolveEndpointIds = async (
  registry: InferenceFeatureRegistry,
  soClient: SavedObjectsClientContract,
  featureId: string,
  logger: Logger
): Promise<ResolvedEndpointIds> => {
  const soFeatures = await readSettingsFeatures(soClient, logger);
  const soFeaturesMap = new Map(soFeatures.map((f) => [f.feature_id, f]));
  return resolveFeatureEndpointIds(registry, soFeaturesMap, featureId, logger);
};

const readSettingsFeatures = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<InferenceSettingsAttributes['features']> => {
  try {
    const so = await soClient.get<InferenceSettingsAttributes>(
      INFERENCE_SETTINGS_SO_TYPE,
      INFERENCE_SETTINGS_ID
    );
    return so.attributes.features ?? [];
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return [];
    }
    logger.error(
      i18n.translate('xpack.searchInferenceEndpoints.endpoints.soReadError', {
        defaultMessage: 'Failed to read inference settings: {message}',
        values: { message: e instanceof Error ? e.message : String(e) },
      })
    );
    return [];
  }
};
