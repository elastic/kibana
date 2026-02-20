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

export interface IdentifyFeaturesOptions {
  streamName: string;
  sampleDocuments: Array<Record<string, any>>;
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
}

export async function identifyFeatures({
  streamName,
  sampleDocuments,
  systemPrompt,
  inferenceClient,
  logger,
  signal,
}: IdentifyFeaturesOptions): Promise<{
  features: BaseFeature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  logger.debug(`Identifying features from ${sampleDocuments.length} sample documents`);

  const response = await withSpan('invoke_prompt', () =>
    inferenceClient.prompt({
      input: {
        sample_documents: JSON.stringify(sampleDocuments),
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

  return {
    features,
    tokensUsed: sumTokens({ prompt: 0, completion: 0, total: 0, cached: 0 }, response.tokens),
  };
}
