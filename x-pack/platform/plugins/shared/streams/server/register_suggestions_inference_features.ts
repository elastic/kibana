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
  STREAMS_INFERENCE_PARENT_FEATURE_ID,
  STREAMS_PARTITIONING_SUGGESTIONS_INFERENCE_FEATURE_ID,
  STREAMS_PROCESSING_SUGGESTIONS_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';

/**
 * Registers Streams parent + child suggestion features with the Inference Feature Registry.
 * No-op when the searchInferenceEndpoints plugin is unavailable.
 */
export function registerSuggestionsInferenceFeatures(
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined,
  logger: Logger
): void {
  if (!searchInferenceEndpoints) {
    return;
  }

  const { register } = searchInferenceEndpoints.features;

  const parentResult = register({
    featureId: STREAMS_INFERENCE_PARENT_FEATURE_ID,
    featureName: i18n.translate('xpack.streams.inferenceFeature.suggestionsParentName', {
      defaultMessage: 'Streams',
    }),
    featureDescription: i18n.translate(
      'xpack.streams.inferenceFeature.suggestionsParentDescription',
      {
        defaultMessage: 'AI models used for Streams suggestions.',
      }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: [],
  });
  if (parentResult.ok) {
    logger.debug(`Registered parent inference feature "${STREAMS_INFERENCE_PARENT_FEATURE_ID}"`);
  } else {
    logger.warn(
      `Failed to register inference feature "${STREAMS_INFERENCE_PARENT_FEATURE_ID}": ${parentResult.error}`
    );
  }

  const children: Array<{
    featureId: string;
    featureName: string;
    featureDescription: string;
    recommendedEndpoints: string[];
  }> = [
    {
      featureId: STREAMS_PARTITIONING_SUGGESTIONS_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.partitionSuggestionsName', {
        defaultMessage: 'Partitioning suggestions',
      }),
      featureDescription: i18n.translate(
        'xpack.streams.inferenceFeature.partitionSuggestionsDescription',
        {
          defaultMessage: 'Model used to suggest partitions.',
        }
      ),
      recommendedEndpoints: [],
    },
    {
      featureId: STREAMS_PROCESSING_SUGGESTIONS_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.streams.inferenceFeature.processingSuggestionsName', {
        defaultMessage: 'Processing suggestions',
      }),
      featureDescription: i18n.translate(
        'xpack.streams.inferenceFeature.processingSuggestionsDescription',
        {
          defaultMessage: 'Model used to suggest processing pipelines and grok/dissect processors.',
        }
      ),
      recommendedEndpoints: [],
    },
  ];

  for (const child of children) {
    const childResult = register({
      featureId: child.featureId,
      parentFeatureId: STREAMS_INFERENCE_PARENT_FEATURE_ID,
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
