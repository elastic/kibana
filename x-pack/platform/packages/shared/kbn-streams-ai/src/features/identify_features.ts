/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentAnalysis, formatDocumentAnalysis } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { type Feature, type Streams } from '@kbn/streams-schema';
import { withSpan } from '@kbn/apm-utils';
import { createIdentifyFeaturesPrompt } from './prompt';
import { sumTokens } from '../helpers/sum_tokens';
import { SYSTEM_PROMPTS } from './system_prompts';

export interface IdentifyFeaturesOptionsBase {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  signal: AbortSignal;
}

export type IdentifyFeaturesOptions = IdentifyFeaturesOptionsBase & {
  analysis: DocumentAnalysis;
};

export async function identifyFeatures<T extends Feature>({
  analysis,
  featureType,
  stream,
  inferenceClient,
  logger,
  signal,
}: IdentifyFeaturesOptions & { featureType: T['type'] }): Promise<{
  features: T[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  logger.debug(`Identifying features for stream ${stream.name}`);

  const systemPrompt = SYSTEM_PROMPTS[featureType];
  const response = await withSpan('invoke_prompt', () =>
    inferenceClient.prompt({
      input: {
        stream: {
          name: stream.name,
          description: stream.description || 'This stream has no description.',
        },
        dataset_analysis: JSON.stringify(
          formatDocumentAnalysis(analysis, { dropEmpty: true, dropUnmapped: true })
        ),
      },
      prompt: createIdentifyFeaturesPrompt({ systemPromptOverride: systemPrompt }),
      finalToolChoice: {
        function: 'finalize_features',
      },
      abortSignal: signal,
    })
  );

  const now = new Date().toISOString();
  const features = response.toolCalls.flatMap((toolCall) =>
    toolCall.function.arguments.features.map((args) => {
      return {
        ...args,
        type: featureType as T['type'],
        status: 'active' as const,
        last_seen: now,
      } as T;
    })
  );

  return {
    features,
    tokensUsed: sumTokens({ prompt: 0, completion: 0, total: 0, cached: 0 }, response.tokens),
  };
}
