/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';

const CONTEXT_ENGINE_PARENT_FEATURE_ID = 'context_engine';
const CONTEXT_ENGINE_PROMPT_FEATURE_ID = 'context_engine_prompt';
const CONTEXT_ENGINE_PROMPT_RECOMMENDED_ENDPOINTS = [
  '.google-gemini-3.5-flash-lite-chat_completion',
  '.anthropic-claude-4.5-haiku-chat_completion',
];

export const registerContextEngineInferenceFeatures = (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup
) => {
  searchInferenceEndpoints.features.register({
    featureId: CONTEXT_ENGINE_PARENT_FEATURE_ID,
    featureName: 'Context Engine',
    featureDescription: 'AI models used for Context Engine',
    taskType: 'chat_completion',
    recommendedEndpoints: [],
  });

  searchInferenceEndpoints.features.register({
    parentFeatureId: CONTEXT_ENGINE_PARENT_FEATURE_ID,
    featureId: CONTEXT_ENGINE_PROMPT_FEATURE_ID,
    featureName: 'Context Engine AI Prompt',
    featureDescription:
      'AI model used for ai.prompt steps inside Context Engine automation workflows. Defaults to a fast, cost-efficient model (Gemini Flash Lite) since these steps run once per document.',
    taskType: 'chat_completion',
    recommendedEndpoints: CONTEXT_ENGINE_PROMPT_RECOMMENDED_ENDPOINTS,
    ignoreGlobalDefault: true,
  });
};
