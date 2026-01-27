/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSampleDocuments } from '@kbn/ai-tools/src/tools/describe_dataset/get_sample_documents';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { type BaseFeature, type Streams, baseFeatureSchema } from '@kbn/streams-schema';
import { withSpan } from '@kbn/apm-utils';
import { createIdentifyFeaturesPrompt } from './prompt';
import { sumTokens } from '../helpers/sum_tokens';

export interface IdentifyFeaturesOptions {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
}

export async function identifyFeatures({
  stream,
  systemPrompt,
  inferenceClient,
  logger,
  start,
  end,
  esClient,
  signal,
}: IdentifyFeaturesOptions): Promise<{
  features: BaseFeature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  logger.debug(`Identifying features for stream ${stream.name}`);

  const { hits: sampleDocuments } = await getSampleDocuments({
    esClient,
    index: stream.name,
    start,
    end,
    size: 20,
  });

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

  const features = response.toolCalls
    .flatMap((toolCall) => toolCall.function.arguments.features)
    .filter((feature) => {
      const result = baseFeatureSchema.safeParse(feature);
      return result.success;
    });

  return {
    features,
    tokensUsed: sumTokens({ prompt: 0, completion: 0, total: 0, cached: 0 }, response.tokens),
  };
}
