/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Feature, Streams } from '@kbn/streams-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { fromKueryExpression } from '@kbn/es-query';
import { withSpan } from '@kbn/apm-utils';
import { createGenerateSignificantEventsPrompt } from './prompt';
import type { SignificantEventType } from './types';
import { sumTokens } from '../helpers/sum_tokens';
import { getComputedFeatureInstructions } from '../features/computed';

interface Query {
  kql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

/**
 * Generate significant event definitions based on the stream's features.
 */
export async function generateSignificantEvents({
  stream,
  features,
  inferenceClient,
  signal,
  systemPrompt,
  logger,
}: {
  stream: Streams.all.Definition;
  features: Feature[];
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  sampleDocsSize?: number;
  systemPrompt: string;
}): Promise<{
  queries: Query[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  logger.debug('Starting significant event generation');

  const prompt = createGenerateSignificantEventsPrompt({ systemPrompt });

  logger.trace('Generating significant events via reasoning agent');
  const response = await withSpan('generate_significant_events', () =>
    executeAsReasoningAgent({
      input: {
        name: stream.name,
        description: stream.description,
        features: JSON.stringify(
          features.map((feature) => omit(feature, ['id', 'status', 'last_seen']))
        ),
        computed_feature_instructions: getComputedFeatureInstructions(),
      },
      maxSteps: 4,
      prompt,
      inferenceClient,
      toolCallbacks: {
        add_queries: async (toolCall) => {
          const queries = toolCall.function.arguments.queries;

          const queryValidationResults = queries.map((query) => {
            let validation: { valid: true } | { valid: false; error: Error } = { valid: true };
            try {
              fromKueryExpression(query.kql);
            } catch (error) {
              validation = { valid: false, error };
            }
            return {
              query,
              valid: validation.valid,
              status: validation.valid ? 'Added' : 'Failed to add',
              error: 'error' in validation ? validation.error.message : undefined,
            };
          });

          return {
            response: {
              queries: queryValidationResults,
            },
          };
        },
      },
      abortSignal: signal,
    })
  );

  const queries = response.input.flatMap((message) => {
    if (message.role === MessageRole.Tool) {
      return message.response.queries.flatMap((query) => {
        if (query.valid) {
          return [query.query];
        }
        return [];
      });
    }
    return [];
  });

  logger.debug(`Generated ${queries.length} significant event queries`);

  return {
    queries,
    tokensUsed: sumTokens(
      {
        prompt: 0,
        completion: 0,
        total: 0,
        cached: 0,
      },
      response.tokens
    ),
  };
}
