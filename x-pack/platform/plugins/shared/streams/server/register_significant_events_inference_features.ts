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
  });
  if (parentResult.ok) {
    logger.debug(
      `Registered inference feature "${STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID}"`
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
  }> = [
    {
      featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.kiExtractionName', {
        defaultMessage: 'Streams Significant Events — Knowledge Indicator extraction',
      }),
      featureDescription: i18n.translate('xpack.streams.inferenceFeature.kiExtractionDescription', {
        defaultMessage: 'Model used to extract knowledge indicators.',
      }),
    },
    {
      featureId: STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.kiQueryGenerationName', {
        defaultMessage: 'Streams Significant Events — Knowledge Indicator query generation',
      }),
      featureDescription: i18n.translate(
        'xpack.streams.inferenceFeature.kiQueryGenerationDescription',
        {
          defaultMessage: 'Model used for Knowledge Indicator query generation.',
        }
      ),
    },
    {
      featureId: STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.discoveryName', {
        defaultMessage: 'Streams Significant Events — Discovery',
      }),
      featureDescription: i18n.translate('xpack.streams.inferenceFeature.discoveryDescription', {
        defaultMessage: 'Model used during Discovery and Significant Event generation.',
      }),
    },
  ];

  for (const child of children) {
    const childResult = register({
      featureId: child.featureId,
      parentFeatureId: STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
      featureName: child.featureName,
      featureDescription: child.featureDescription,
      taskType: 'chat_completion',
      recommendedEndpoints: [],
    });
    if (childResult.ok) {
      logger.debug(`Registered inference feature "${child.featureId}"`);
    } else {
      logger.warn(
        `Failed to register inference feature "${child.featureId}": ${childResult.error}`
      );
    }
  }
}
