/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import {
  OBSERVABILITY_AI_ASSISTANT_INFERENCE_FEATURE_ID,
  OBSERVABILITY_AI_ASSISTANT_INFERENCE_SUBFEATURE_ID,
} from '../common/feature';

const observabilityAIAssistantParentFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureName: 'Observability',
  featureDescription: 'Parent feature for Observability AI Settings',
  taskType: 'chat_completion',
  recommendedEndpoints: [defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION],
};

const observabilityAIAssistantChatCompletionFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_ASSISTANT_INFERENCE_SUBFEATURE_ID,
  parentFeatureId: OBSERVABILITY_AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureName: 'Observability AI Settings',
  featureDescription:
    'Inference endpoint configuration for Observability AI Assistant + Contextual Insights / Observability Agent + AI Insights',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

export const observabilityAIAssistantInferenceFeatures: InferenceFeatureConfig[] = [
  observabilityAIAssistantParentFeature,
  observabilityAIAssistantChatCompletionFeature,
];
