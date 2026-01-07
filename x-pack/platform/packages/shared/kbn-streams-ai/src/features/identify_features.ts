/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { type BaseFeature, type Streams } from '@kbn/streams-schema';
import { withSpan } from '@kbn/apm-utils';
import { createIdentifyFeaturesPrompt } from './prompt';
import { sumTokens } from '../helpers/sum_tokens';

export interface IdentifyFeaturesOptions {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  prompt: string;
  logger: Logger;
  signal: AbortSignal;
}

export async function identifyFeatures({
  stream,
  prompt,
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

  const analysis = await describeDataset({
    start,
    end,
    esClient,
    index: stream.name,
  });

  const response = await withSpan('invoke_prompt', () =>
    inferenceClient.prompt({
      input: {
        dataset_analysis: JSON.stringify(
          formatDocumentAnalysis(analysis, { dropEmpty: true, dropUnmapped: false })
        ),
      },
      prompt: createIdentifyFeaturesPrompt({ systemPrompt: prompt }),
      finalToolChoice: {
        function: 'finalize_features',
      },
      abortSignal: signal,
    })
  );

  const features = response.toolCalls.flatMap((toolCall) => toolCall.function.arguments.features);

  return {
    features,
    tokensUsed: sumTokens({ prompt: 0, completion: 0, total: 0, cached: 0 }, response.tokens),
  };
}
