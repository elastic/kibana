/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import {
  AI_ASSISTANT_MODEL_SETTINGS_PARENT_FEATURE_ID,
  OBSERVABILITY_AI_ASSISTANT_MODEL_SETTINGS_FEATURE_ID,
} from '../common/feature';

const aiAssistantInferenceFeature: InferenceFeatureConfig = {
  featureId: AI_ASSISTANT_MODEL_SETTINGS_PARENT_FEATURE_ID,
  featureName: 'AI Assistant',
  featureDescription: 'Parent feature for AI Assistant',
  taskType: 'chat_completion',
  recommendedEndpoints: [defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION],
};

const observabilityAIAssistantInferenceSubFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_ASSISTANT_MODEL_SETTINGS_FEATURE_ID,
  parentFeatureId: AI_ASSISTANT_MODEL_SETTINGS_PARENT_FEATURE_ID,
  featureName: 'Observability AI Assistant',
  featureDescription: 'Observability AI Assistant inference endpoint configuration',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

export const observabilityAIAssistantInferenceFeatures: InferenceFeatureConfig[] = [
  aiAssistantInferenceFeature,
  observabilityAIAssistantInferenceSubFeature,
];
