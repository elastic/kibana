/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { type InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { INFERENCE_SETTINGS_SO_TYPE, INFERENCE_SETTINGS_ID } from '../common/constants';
import type { InferenceSettingsAttributes } from '../common/types';
import type { InferenceFeatureRegistry } from './inference_feature_registry';
import type { ResolvedInferenceEndpoints } from './types';

/**
 * Returns the resolved inference endpoints for a feature.
 * Walks the fallback chain (admin SO override → recommendedEndpoints → parent feature)
 * and fetches full endpoint objects from Elasticsearch.
 *
 * @param registry - The feature registry to look up feature configs.
 * @param soClient - A scoped saved objects client.
 * @param esClient - A scoped Elasticsearch client.
 * @param featureId - The feature to resolve endpoints for.
 * @throws If `featureId` is not registered.
 */
export const getForFeature = async (
  registry: InferenceFeatureRegistry,
  soClient: ISavedObjectsRepository,
  esClient: ElasticsearchClient,
  featureId: string
): Promise<ResolvedInferenceEndpoints> => {
  const { ids, warnings: resolveWarnings } = await resolveEndpointIds(
    registry,
    soClient,
    featureId
  );
  if (ids.length === 0) {
    return { endpoints: [], warnings: resolveWarnings };
  }
  const result = await fetchEndpoints(esClient, ids);
  return {
    endpoints: result.endpoints,
    warnings: [...resolveWarnings, ...result.warnings],
  };
};

interface ResolvedEndpointIds {
  ids: string[];
  warnings: string[];
}

const resolveEndpointIds = async (
  registry: InferenceFeatureRegistry,
  soClient: ISavedObjectsRepository,
  featureId: string
): Promise<ResolvedEndpointIds> => {
  let current = registry.get(featureId);
  if (!current) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.endpoints.featureNotFound', {
        defaultMessage: 'Feature with id "{featureId}" is not registered.',
        values: { featureId },
      })
    );
  }
  let recEntry = current.recommendedEndpoints?.length
    ? { featureId: current.featureId, recommendedEndpoints: current.recommendedEndpoints }
    : undefined;
  const soFeatures = await readSettingsFeatures(soClient);
  const soFeaturesMap = new Map(soFeatures.map((f) => [f.feature_id, f]));

  // Walk the fallback chain for the feature:
  // 1. Check for an admin-configured SO override for the current feature
  // 2. Follow the parentFeatureId link and repeat
  // 3. Fall back to the feature's recommendedEndpoints
  // The visited set prevents infinite loops from circular parent references.
  const visited = new Set<string>();
  let currentId = featureId;

  const initialSoEntry = soFeaturesMap.get(currentId);
  if (initialSoEntry && initialSoEntry.endpoints.length > 0) {
    return { ids: initialSoEntry.endpoints.map((e) => e.id), warnings: [] };
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
        return { ids: soEntry.endpoints.map((e) => e.id), warnings: [] };
      }

      if (current.parentFeatureId) {
        currentId = current.parentFeatureId;
      } else {
        break;
      }
    }
  }

  return {
    ids: recEntry?.recommendedEndpoints ?? [],
    warnings: [],
  };
};

/**
 * Fetches full inference endpoint objects from Elasticsearch by their IDs.
 * Returns the successfully fetched endpoints as InferenceConnector and warnings for any that were not found (404).
 * Non-404 errors are propagated.
 */
const fetchEndpoints = async (
  esClient: ElasticsearchClient,
  ids: string[]
): Promise<ResolvedInferenceEndpoints> => {
  const endpoints: InferenceConnector[] = [];
  const warnings: string[] = [];

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await esClient.inference.get({ inference_id: id });
        return { id, endpoint: response.endpoints[0] ?? null };
      } catch (e) {
        if (e?.statusCode === 404) {
          return { id, endpoint: null };
        }
        throw e;
      }
    })
  );

  for (const { id, endpoint } of results) {
    if (endpoint) {
      const serviceSettings = endpoint.service_settings as Record<string, unknown> | undefined;
      const connector: InferenceConnector = {
        type: InferenceConnectorType.Inference,
        name: endpoint.inference_id,
        connectorId: endpoint.inference_id,
        config: {
          inferenceId: endpoint.inference_id,
          providerConfig: {
            model_id: serviceSettings?.model_id,
          },
          taskType: endpoint.task_type,
          service: endpoint.service,
          serviceSettings,
        },
        capabilities: {},
        isInferenceEndpoint: true,
      };
      endpoints.push(connector);
    } else {
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

const readSettingsFeatures = async (
  soClient: ISavedObjectsRepository
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
    throw e;
  }
};
