/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksStart,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { getForFeature as getForFeatureFn } from './inference_endpoints';
import type { InferenceFeatureRegistry } from './inference_feature_registry';
import { resolveModelsForFeature } from './lib/resolve_models_for_feature';
import type { GetForFeatureOptions, SearchInferenceEndpointsPluginStart } from './types';
import { INFERENCE_SETTINGS_SO_TYPE } from '../common/constants';

// Model settings are admin policy that must apply to every user, including those
// without read access to the settings saved object, so the read bypasses user authz
// while staying scoped to the request's active space.
export const getInferenceSettingsClient = (
  savedObjects: Pick<SavedObjectsServiceStart, 'getUnsafeInternalClient' | 'getScopedClient'>,
  request: KibanaRequest
): SavedObjectsClientContract => {
  const internalClient = savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
  });
  const namespace = savedObjects.getScopedClient(request).getCurrentNamespace();
  return namespace ? internalClient.asScopedToNamespace(namespace) : internalClient;
};

/**
 * The started plugin contract: the feature registry and the endpoints resolved for a feature. The
 * plugin builds it in Kibana and its tasks entry in a task runtime, so both resolve the same way.
 */
export const createSearchInferenceEndpointsStart = ({
  core,
  inference,
  featureRegistry,
  logger,
}: {
  core: Pick<CoreTasksStart, 'savedObjects' | 'uiSettings'>;
  inference: Pick<InferenceServerStart, 'getConnectorById' | 'getConnectorList'>;
  featureRegistry: InferenceFeatureRegistry;
  logger: Logger;
}): SearchInferenceEndpointsPluginStart => ({
  features: {
    get: featureRegistry.get.bind(featureRegistry),
    getAll: featureRegistry.getAll.bind(featureRegistry),
    register: featureRegistry.register.bind(featureRegistry),
    updateRecommendedEndpoints: featureRegistry.updateRecommendedEndpoints.bind(featureRegistry),
  },
  endpoints: {
    getForFeature: async (
      featureId: string,
      request: KibanaRequest,
      opts?: GetForFeatureOptions
    ) => {
      const soClient = getInferenceSettingsClient(core.savedObjects, request);
      const getConnectorById = (id: string) => inference.getConnectorById(id, request);
      const uiSettingsClient = core.uiSettings.asScopedToClient(
        core.savedObjects.getScopedClient(request)
      );

      // `onlyReturnConfigured` has to reach endpoint-id resolution. Otherwise a
      // feature with no saved row and no recommended endpoints answers with the
      // platform default, and a caller cannot tell that nothing was configured.
      const resolveFeatureEndpoints = (fId: string) =>
        getForFeatureFn(featureRegistry, soClient, getConnectorById, fId, logger, opts);
      const getConnectorList = () => inference.getConnectorList(request);
      const feature = featureRegistry.get(featureId);

      const result = await resolveModelsForFeature({
        getForFeature: resolveFeatureEndpoints,
        getConnectorList,
        getConnectorById,
        uiSettingsClient,
        featureId,
        ignoreGlobalDefault: feature?.ignoreGlobalDefault ?? false,
        opts,
        logger,
      });

      return {
        endpoints: result.connectors,
        warnings: result.warnings,
        soEntryFound: result.soEntryFound,
      };
    },
  },
});
