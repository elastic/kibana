/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { COMPLETION_TASK_TYPE, DECISION_TASK_TYPE } from '@kbn/inference-common';
import {
  AGENT_BUILDER_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_DECISION_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_RECOMMENDED_ENDPOINTS,
  AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS,
  AGENT_BUILDER_DECISION_RECOMMENDED_ENDPOINTS,
} from '@kbn/agent-builder-common/constants';

export const registerInferenceFeatures = ({
  searchInferenceEndpoints,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup;
}) => {
  // parent feature (just the category in the UI)
  searchInferenceEndpoints.features.register({
    featureId: AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID,
    featureName: 'Agent Builder',
    featureDescription: 'AI models used for Agent Builder',
    taskType: COMPLETION_TASK_TYPE,
    recommendedEndpoints: AGENT_BUILDER_RECOMMENDED_ENDPOINTS,
  });

  // main list of model selection for AB
  searchInferenceEndpoints.features.register({
    parentFeatureId: AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID,
    featureId: AGENT_BUILDER_INFERENCE_FEATURE_ID,
    featureName: 'Main models',
    featureDescription: 'List of models selectable from the UI',
    taskType: COMPLETION_TASK_TYPE,
    recommendedEndpoints: AGENT_BUILDER_RECOMMENDED_ENDPOINTS,
  });

  // fast model selection
  searchInferenceEndpoints.features.register({
    parentFeatureId: AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID,
    featureId: AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
    featureName: 'Fast models',
    featureDescription: 'Models used for fast and low effort tasks',
    taskType: COMPLETION_TASK_TYPE,
    recommendedEndpoints: AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS,
  });

  // decision model selection, only listed when experimental features are on
  searchInferenceEndpoints.features.register({
    parentFeatureId: AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID,
    featureId: AGENT_BUILDER_DECISION_INFERENCE_FEATURE_ID,
    featureName: 'Decision models',
    featureDescription: 'Models used for quick decisions',
    taskType: DECISION_TASK_TYPE,
    recommendedEndpoints: AGENT_BUILDER_DECISION_RECOMMENDED_ENDPOINTS,
    isTechPreview: true,
    ignoreGlobalDefault: true,
    visibilityCondition: { key: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID, value: true },
  });
};
