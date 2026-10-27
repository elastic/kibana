/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  InferenceFeatureConfig,
  SearchInferenceEndpointsPluginSetup,
} from '@kbn/search-inference-endpoints/server';
import {
  CONTEXT_ENGINE_INFERENCE_FEATURE_ID,
  CONTEXT_ENGINE_MEMORY_INFERENCE_FEATURE_ID,
  CONTEXT_ENGINE_MEMORY_RECOMMENDED_ENDPOINTS,
} from '../../../common/memory';

const CONTEXT_ENGINE_INFERENCE_FEATURES: readonly InferenceFeatureConfig[] = [
  {
    featureId: CONTEXT_ENGINE_INFERENCE_FEATURE_ID,
    featureName: 'Context Engine',
    featureDescription: 'AI models used by Context Engine',
    taskType: 'chat_completion',
    recommendedEndpoints: CONTEXT_ENGINE_MEMORY_RECOMMENDED_ENDPOINTS,
  },
  {
    parentFeatureId: CONTEXT_ENGINE_INFERENCE_FEATURE_ID,
    featureId: CONTEXT_ENGINE_MEMORY_INFERENCE_FEATURE_ID,
    featureName: 'Memory dreaming',
    featureDescription: 'Model that turns short-term memories into long-term memories',
    taskType: 'chat_completion',
    recommendedEndpoints: CONTEXT_ENGINE_MEMORY_RECOMMENDED_ENDPOINTS,
  },
];

/** Registers the model settings for Context Engine, so users can pick the dreaming model. */
export const registerContextEngineInferenceFeatures = ({
  searchInferenceEndpoints,
  logger,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup;
  logger: Logger;
}): void => {
  for (const feature of CONTEXT_ENGINE_INFERENCE_FEATURES) {
    const result = searchInferenceEndpoints.features.register(feature);
    if (!result.ok) {
      logger.warn(`Failed to register inference feature '${feature.featureId}': ${result.error}`);
    }
  }
};
