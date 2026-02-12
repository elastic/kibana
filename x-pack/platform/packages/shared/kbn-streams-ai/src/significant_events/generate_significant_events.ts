/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, Streams, System } from '@kbn/streams-schema';
import type { Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { fromKueryExpression } from '@kbn/es-query';
import { withSpan } from '@kbn/apm-utils';
import { createGenerateSignificantEventsPrompt } from './prompt';
import type { SignificantEventType } from './types';
import { sumTokens } from '../helpers/sum_tokens';
import { getComputedFeatureInstructions } from '../features/computed';
import { toLlmFeature } from './tools/features_tool';

interface Query {
  kql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

export interface SignificantEventsToolUsage {
  get_stream_features: {
    calls: number;
    failures: number;
    latency_ms: number;
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Generate significant event definitions, based on:
 * - the description of the system (or stream if system is undefined)
 * - dataset analysis
 * - for the given significant event types
 */
export async function generateSignificantEvents({
  stream,
  system,
  getFeatures,
  inferenceClient,
  signal,
  systemPrompt,
  logger,
}: {
  stream: Streams.all.Definition;
  system?: System;
  getFeatures(params?: { type?: string[] }): Promise<Feature[]>;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  systemPrompt: string;
}): Promise<{
  queries: Query[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
}> {
  logger.debug('Starting significant event generation');
  const toolUsage: SignificantEventsToolUsage = {
    get_stream_features: { calls: 0, failures: 0, latency_ms: 0 },
  };

  const prompt = createGenerateSignificantEventsPrompt({ systemPrompt });

  logger.trace('Generating significant events via reasoning agent');
  const response = await withSpan('generate_significant_events', () =>
    executeAsReasoningAgent({
      input: {
        name: system?.name || stream.name,
        description: system?.description || stream.description,
        computed_feature_instructions: getComputedFeatureInstructions(),
      },
      maxSteps: 4,
      prompt,
      inferenceClient,
      toolCallbacks: {
        // Context is retrieved on-demand through tools to keep prompts compact
        // and to make this pattern reusable for future context providers.
        get_stream_features: async (toolCall) => {
          toolUsage.get_stream_features.calls += 1;
          const startTime = Date.now();
          try {
            const features = await withSpan('get_stream_features_for_significant_events', () =>
              getFeatures()
            );
            const llmFeatures = features.map(toLlmFeature);
            toolUsage.get_stream_features.latency_ms += Date.now() - startTime;

            return {
              response: {
                features: llmFeatures,
                count: llmFeatures.length,
              },
            };
          } catch (error) {
            toolUsage.get_stream_features.failures += 1;
            toolUsage.get_stream_features.latency_ms += Date.now() - startTime;
            const errorMessage = getErrorMessage(error);
            logger.warn(`Failed to fetch stream features: ${errorMessage}`);
            return {
              response: {
                features: [],
                count: 0,
                error: errorMessage,
              },
            };
          }
        },
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
      const responsePayload = message.response;
      if (
        !responsePayload ||
        typeof responsePayload !== 'object' ||
        !('queries' in responsePayload)
      ) {
        return [];
      }
      const queriesFromResponse = responsePayload.queries;
      if (!Array.isArray(queriesFromResponse)) {
        return [];
      }
      return queriesFromResponse.flatMap((query) => {
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
    toolUsage,
  };
}
