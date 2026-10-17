/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  type InferenceConnector,
  type InferenceModelParameters,
  defaultInferenceEndpoints,
} from '@kbn/inference-common';
import { INFERENCE_SETTINGS_SO_TYPE, INFERENCE_SETTINGS_ID } from '../common/constants';
import type { InferenceSettingsAttributes } from '../common/types';
import type { InferenceFeatureRegistry } from './inference_feature_registry';
import type {
  GetForFeatureOptions,
  RecommendedEndpoint,
  RegisteredInferenceFeature,
  ResolvedInferenceEndpoints,
} from './types';

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
 * @param opts - Optional resolution options (see {@link GetForFeatureOptions}).
 */
export const getForFeature = async (
  registry: InferenceFeatureRegistry,
  soClient: SavedObjectsClientContract,
  getConnectorById: (id: string) => Promise<InferenceConnector>,
  featureId: string,
  logger: Logger,
  opts?: GetForFeatureOptions
): Promise<ResolvedInferenceEndpoints> => {
  const {
    endpoints: resolvedEndpoints,
    warnings: resolveWarnings,
    soEntryFound,
  } = await resolveEndpoints(registry, soClient, featureId, logger, opts);
  if (resolvedEndpoints.length === 0) {
    return { endpoints: [], warnings: resolveWarnings, soEntryFound };
  }
  const result = await fetchConnectors(getConnectorById, resolvedEndpoints);
  return {
    endpoints: result.endpoints,
    warnings: [...resolveWarnings, ...result.warnings],
    soEntryFound,
  };
};

/**
 * Fetches the connector for each endpoint using getConnectorById and attaches its parameters.
 * Returns warnings for any IDs that were not found.
 */
const fetchConnectors = async (
  getConnectorById: (id: string) => Promise<InferenceConnector>,
  resolvedEndpoints: RecommendedEndpoint[]
): Promise<Omit<ResolvedInferenceEndpoints, 'soEntryFound'>> => {
  const endpoints: ResolvedInferenceEndpoints['endpoints'] = [];
  const warnings: string[] = [];

  for (const { id, parameters } of resolvedEndpoints) {
    try {
      const connector = await getConnectorById(id);
      endpoints.push(
        parameters ? { ...connector, parameters: structuredClone(parameters) } : connector
      );
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

interface ResolvedFeatureEndpoints {
  endpoints: RecommendedEndpoint[];
  warnings: string[];
  /** True when an SO entry was found for the feature (even if it had an empty endpoints list). */
  soEntryFound: boolean;
}

type SoFeatureSetting = InferenceSettingsAttributes['features'][number];

const getFeatureChain = (
  registry: InferenceFeatureRegistry,
  featureId: string
): RegisteredInferenceFeature[] => {
  const chain: RegisteredInferenceFeature[] = [];
  let feature = registry.get(featureId);
  while (feature && !chain.includes(feature)) {
    chain.push(feature);
    feature = feature.parentFeatureId ? registry.get(feature.parentFeatureId) : undefined;
  }
  return chain;
};

const findDeclaredEndpoint = (
  registry: InferenceFeatureRegistry,
  featureId: string,
  endpointId: string
): RecommendedEndpoint => {
  const declared = getFeatureChain(registry, featureId)
    .flatMap(({ recommendedEndpoints }) => recommendedEndpoints)
    .find(({ id, parameters }) => id === endpointId && parameters !== undefined);
  return declared ?? { id: endpointId };
};

const withDeclaredParameters = (
  registry: InferenceFeatureRegistry,
  featureId: string,
  endpoints: Array<{ id: string }>
): RecommendedEndpoint[] =>
  endpoints.map(({ id }) => findDeclaredEndpoint(registry, featureId, id));

/**
 * Returns a copy of the parameters the feature chain declares for an endpoint id, regardless of
 * whether that endpoint is in the feature's resolved list.
 */
export const getDeclaredParameters = (
  registry: InferenceFeatureRegistry,
  featureId: string,
  endpointId: string
): InferenceModelParameters | undefined => {
  const { parameters } = findDeclaredEndpoint(registry, featureId, endpointId);
  return parameters && structuredClone(parameters);
};

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
 *
 * Each endpoint carries the parameters of the nearest feature in the chain, starting from the
 * requested feature, that declares parameters for the same endpoint id. A plain id declares
 * nothing and inherits; `{ id, parameters: {} }` opts out of inherited parameters.
 */
export const resolveFeatureEndpoints = (
  registry: InferenceFeatureRegistry,
  soFeaturesMap: Map<string, SoFeatureSetting>,
  featureId: string,
  logger: Logger,
  opts?: GetForFeatureOptions
): ResolvedFeatureEndpoints => {
  let current = registry.get(featureId);
  if (!current) {
    logger.warn(
      i18n.translate('xpack.searchInferenceEndpoints.endpoints.featureNotFound', {
        defaultMessage: 'Feature with id "{featureId}" is not registered.',
        values: { featureId },
      })
    );
    return { endpoints: [], warnings: [], soEntryFound: false };
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
      endpoints: withDeclaredParameters(registry, featureId, initialSoEntry.endpoints),
      warnings: [],
      soEntryFound: true,
    };
  }
  if (initialSoEntry && initialSoEntry.endpoints.length === 0) {
    return { endpoints: [], warnings: [], soEntryFound: true };
  }

  visited.add(currentId);
  if (current.parentFeatureId) {
    currentId = current?.parentFeatureId;

    while (true) {
      if (visited.has(currentId)) {
        return {
          endpoints: [],
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
          endpoints: withDeclaredParameters(registry, featureId, soEntry.endpoints),
          warnings: [],
          soEntryFound: true,
        };
      }
      if (soEntry && soEntry.endpoints.length === 0) {
        return { endpoints: [], warnings: [], soEntryFound: true };
      }

      if (current.parentFeatureId) {
        currentId = current.parentFeatureId;
      } else {
        break;
      }
    }
  }

  return {
    endpoints: recEntry
      ? withDeclaredParameters(registry, featureId, recEntry.recommendedEndpoints)
      : opts?.onlyReturnConfigured
      ? []
      : [{ id: defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION }],
    warnings: [],
    soEntryFound: false,
  };
};

const resolveEndpoints = async (
  registry: InferenceFeatureRegistry,
  soClient: SavedObjectsClientContract,
  featureId: string,
  logger: Logger,
  opts?: GetForFeatureOptions
): Promise<ResolvedFeatureEndpoints> => {
  const soFeatures = await readSettingsFeatures(soClient, logger);
  const soFeaturesMap = new Map(soFeatures.map((f) => [f.feature_id, f]));
  return resolveFeatureEndpoints(registry, soFeaturesMap, featureId, logger, opts);
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
