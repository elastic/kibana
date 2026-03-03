/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { type BaseFeature, baseFeatureSchema } from '@kbn/streams-schema';
import { withSpan } from '@kbn/apm-utils';
import { createIdentifyFeaturesPrompt } from './prompt';
import { sumTokens } from '../helpers/sum_tokens';

export interface DeletedFeatureSummary {
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description?: string;
  properties: Record<string, unknown>;
}

export interface IgnoredFeature {
  feature_id: string;
  feature_title: string;
  deleted_feature_id: string;
  reason: string;
}

export interface IdentifyFeaturesOptions {
  streamName: string;
  sampleDocuments: Array<Record<string, any>>;
  deletedFeatures?: DeletedFeatureSummary[];
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
}

export async function identifyFeatures({
  streamName,
  sampleDocuments,
  deletedFeatures,
  systemPrompt,
  inferenceClient,
  logger,
  signal,
}: IdentifyFeaturesOptions): Promise<{
  features: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  logger.debug(`Identifying features from ${sampleDocuments.length} sample documents`);

  const response = await withSpan('invoke_prompt', () =>
    inferenceClient.prompt({
      input: {
        sample_documents: JSON.stringify(sampleDocuments),
        deleted_features:
          deletedFeatures && deletedFeatures.length > 0 ? JSON.stringify(deletedFeatures) : '',
      },
      prompt: createIdentifyFeaturesPrompt({ systemPrompt }),
      finalToolChoice: {
        function: 'finalize_features',
      },
      abortSignal: signal,
    })
  );

  const features = uniqBy(
    response.toolCalls
      .flatMap((toolCall) => toolCall.function.arguments.features)
      .map((feature) => ({
        ...feature,
        stream_name: streamName,
      }))
      .filter((feature) => {
        const result = baseFeatureSchema.safeParse(feature);
        if (!result.success) {
          return false;
        }

        // ensure that the feature has at least one stable identifying property
        return Object.keys(feature.properties).length > 0;
      }),
    (feature) => feature.id
  );

  const ignoredFeatures: IgnoredFeature[] = response.toolCalls.flatMap(
    (toolCall) => toolCall.function.arguments.ignored_features ?? []
  );

  return {
    features,
    ignoredFeatures,
    tokensUsed: sumTokens({ prompt: 0, completion: 0, total: 0, cached: 0 }, response.tokens),
  };
}
