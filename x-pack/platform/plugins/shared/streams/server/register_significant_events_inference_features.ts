/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import { i18n } from '@kbn/i18n';
import {
  STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';

const KI_EXTRACTION_RECOMMENDED_MODELS = [
  '.openai-gpt-oss-120b-chat_completion',
  '.openai-gpt-5.2-chat_completion',
  '.anthropic-claude-4.6-sonnet-chat_completion',
];

const KI_QUERY_GENERATION_RECOMMENDED_MODELS = [
  '.openai-gpt-5.2-chat_completion',
  '.anthropic-claude-4.6-sonnet-chat_completion',
  '.openai-gpt-oss-120b-chat_completion',
];

const DISCOVERY_RECOMMENDED_MODELS = [
  '.anthropic-claude-4.6-opus-chat_completion',
  '.anthropic-claude-4.6-sonnet-chat_completion',
  '.openai-gpt-5.2-chat_completion',
];

/**
 * Registers Streams Significant Events parent + child features with the Inference Feature Registry.
 * No-op when the searchInferenceEndpoints plugin is unavailable.
 */
export function registerSignificantEventsInferenceFeatures(
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined,
  logger: Logger
): void {
  if (!searchInferenceEndpoints) {
    return;
  }

  const { register } = searchInferenceEndpoints.features;

  const parentResult = register({
    featureId: STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
    featureName: i18n.translate('xpack.streams.inferenceFeature.significantEventsParentName', {
      defaultMessage: 'Streams Significant Events',
    }),
    featureDescription: i18n.translate(
      'xpack.streams.inferenceFeature.significantEventsParentDescription',
      {
        defaultMessage:
          'AI models used for Streams Significant Events (knowledge indicators, queries, discovery).',
      }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: [],
    isTechPreview: true,
  });
  if (parentResult.ok) {
    logger.debug(
      `Registered parent inference feature "${STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID}"`
    );
  } else {
    logger.warn(
      `Failed to register inference feature "${STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID}": ${parentResult.error}`
    );
  }

  const children: Array<{
    featureId: string;
    featureName: string;
    featureDescription: string;
    recommendedEndpoints: string[];
  }> = [
    {
      featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.kiExtractionName', {
        defaultMessage: 'Knowledge Indicator extraction',
      }),
      featureDescription: i18n.translate('xpack.streams.inferenceFeature.kiExtractionDescription', {
        defaultMessage: 'Model used to extract Knowledge Indicators.',
      }),
      recommendedEndpoints: KI_EXTRACTION_RECOMMENDED_MODELS,
    },
    {
      featureId: STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.kiQueryGenerationName', {
        defaultMessage: 'Knowledge Indicator Query generation',
      }),
      featureDescription: i18n.translate(
        'xpack.streams.inferenceFeature.kiQueryGenerationDescription',
        {
          defaultMessage: 'Model used for Knowledge Indicator Query generation.',
        }
      ),
      recommendedEndpoints: KI_QUERY_GENERATION_RECOMMENDED_MODELS,
    },
    {
      featureId: STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.discoveryName', {
        defaultMessage: 'Discovery',
      }),
      featureDescription: i18n.translate('xpack.streams.inferenceFeature.discoveryDescription', {
        defaultMessage: 'Model used during Discovery and Significant Event generation.',
      }),
      recommendedEndpoints: DISCOVERY_RECOMMENDED_MODELS,
    },
  ];

  for (const child of children) {
    const childResult = register({
      featureId: child.featureId,
      parentFeatureId: STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
      featureName: child.featureName,
      featureDescription: child.featureDescription,
      taskType: 'chat_completion',
      recommendedEndpoints: child.recommendedEndpoints,
    });
    if (childResult.ok) {
      logger.debug(`Registered child inference feature "${child.featureId}"`);
    } else {
      logger.warn(
        `Failed to register inference feature "${child.featureId}": ${childResult.error}`
      );
    }
  }
}
