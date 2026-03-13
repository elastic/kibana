/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Mirrors server-side InferenceFeatureConfig from inference_feature_registry.
 * TODO: import from server types once feature registry PR (#256515) is merged
 */
export interface InferenceFeatureConfig {
  featureId: string;
  parentFeatureId?: string;
  featureName: string;
  featureDescription: string;
  taskType: string;
  maxNumberOfEndpoints?: number;
  recommendedEndpoints: string[];
}

// TODO: replace with GET /internal/search_inference_endpoints/features API
export const MOCK_REGISTERED_FEATURES: InferenceFeatureConfig[] = [
  {
    featureId: 'search',
    featureName: i18n.translate('xpack.searchInferenceEndpoints.settings.feature.search.name', {
      defaultMessage: 'Search',
    }),
    featureDescription: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.search.description',
      { defaultMessage: 'Features related to AI-powered search capabilities.' }
    ),
    taskType: '',
    recommendedEndpoints: [],
  },
  {
    featureId: 'agent_builder_general',
    parentFeatureId: 'search',
    featureName: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.agentBuilder.name',
      { defaultMessage: 'Agent Builder — General Models' }
    ),
    featureDescription: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.agentBuilder.description',
      {
        defaultMessage:
          'Utilize AI-powered capabilities to build and interact with agents alongside your Elasticsearch data.',
      }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: ['.anthropic-claude-4.6-sonnet', '.anthropic-claude-4.5-sonnet'],
  },
  {
    featureId: 'agent_builder_fast',
    parentFeatureId: 'search',
    featureName: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.agentBuilderFast.name',
      { defaultMessage: 'Agent Builder — Fast Models' }
    ),
    featureDescription: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.agentBuilderFast.description',
      {
        defaultMessage:
          'Utilize AI-powered capabilities to build and interact with agents alongside your Elasticsearch data.',
      }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: ['.anthropic-claude-3.7-sonnet'],
  },
  {
    featureId: 'security',
    featureName: i18n.translate('xpack.searchInferenceEndpoints.settings.feature.security.name', {
      defaultMessage: 'Security',
    }),
    featureDescription: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.security.description',
      { defaultMessage: 'Features related to security analytics and threat detection.' }
    ),
    taskType: '',
    recommendedEndpoints: [],
  },
  {
    featureId: 'attack_discovery',
    parentFeatureId: 'security',
    featureName: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.attackDiscovery.name',
      { defaultMessage: 'Attack Discovery' }
    ),
    featureDescription: i18n.translate(
      'xpack.searchInferenceEndpoints.settings.feature.attackDiscovery.description',
      {
        defaultMessage: 'Configure text embedding models for semantic search and retrieval.',
      }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: ['.anthropic-claude-4.6-sonnet'],
  },
];
