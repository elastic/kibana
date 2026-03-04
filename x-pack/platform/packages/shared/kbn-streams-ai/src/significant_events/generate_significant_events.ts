/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, Streams } from '@kbn/streams-schema';
import {
  ensureMetadata,
  getIndexPatternsForStream,
  getSourcesForStream,
  replaceFromSources,
} from '@kbn/streams-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { withSpan } from '@kbn/apm-utils';
import { createGenerateSignificantEventsPrompt } from './prompt';
import type { SignificantEventType } from './types';
import { sumTokens } from '../helpers/sum_tokens';
import { getComputedFeatureInstructions } from '../features/computed';
import {
  SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES,
  getFeatureQueryFromToolArgs,
  resolveFeatureTypeFilters,
  toFeatureForLlmContext,
} from './tools/features_tool';
import {
  createDefaultSignificantEventsToolUsage,
  type SignificantEventsToolUsage,
} from './tools/tool_usage';

interface Query {
  esql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Generate significant event definitions using a reasoning agent that fetches
 * stream features (including computed dataset analysis) via tool calls.
 */
export async function generateSignificantEvents({
  stream,
  esClient,
  start,
  end,
  getFeatures,
  inferenceClient,
  signal,
  systemPrompt,
  logger,
}: {
  stream: Streams.all.Definition;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  getFeatures(params?: {
    type?: string[];
    minConfidence?: number;
    limit?: number;
  }): Promise<Feature[]>;
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

  const toolUsage = createDefaultSignificantEventsToolUsage();

  const prompt = createGenerateSignificantEventsPrompt({ systemPrompt });
  const targetSources = getSourcesForStream(stream);

  logger.trace('Generating significant events via reasoning agent');
  const response = await withSpan('generate_significant_events', () =>
    executeAsReasoningAgent({
      input: {
        name: stream.name,
        description: stream.description,
        available_feature_types: SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES.join(', '),
        computed_feature_instructions: getComputedFeatureInstructions(),
      },
      maxSteps: 4,
      prompt,
      inferenceClient,
      toolCallbacks: {
        get_stream_features: async (toolCall) => {
          toolUsage.get_stream_features.calls += 1;
          const startTime = Date.now();
          try {
            // Keep this intentionally permissive: ignore unknown tool args instead of failing generation.
            const { featureTypes, minConfidence, limit } = getFeatureQueryFromToolArgs(
              toolCall.function.arguments
            );
            const typeFilters = resolveFeatureTypeFilters(featureTypes);
            const features = await withSpan('get_stream_features_for_significant_events', () =>
              getFeatures({
                type: typeFilters,
                minConfidence,
                limit,
              })
            );
            const llmFeatures = features.map(toFeatureForLlmContext);

            return {
              response: {
                features: llmFeatures,
                count: llmFeatures.length,
              },
            };
          } catch (error) {
            toolUsage.get_stream_features.failures += 1;
            const errorMessage = getErrorMessage(error);
            logger.warn(`Failed to fetch stream features: ${errorMessage}`);
            return {
              response: {
                features: [],
                count: 0,
                error: errorMessage,
              },
            };
          } finally {
            toolUsage.get_stream_features.latency_ms += Date.now() - startTime;
          }
        },
        add_queries: async (toolCall) => {
          toolUsage.add_queries.calls += 1;
          const startTime = Date.now();

          const queries = toolCall.function.arguments.queries;
          let hasFailures = false;

          const queryValidationResults = await Promise.all(
            queries.map(async (query) => {
              try {
                const rewritten = ensureMetadata(replaceFromSources(query.esql, targetSources));

                await esClient.esql.query({
                  query: `${rewritten}\n| LIMIT 0`,
                  format: 'json',
                });

                return {
                  query: { ...query, esql: rewritten },
                  valid: true,
                  status: 'Added',
                  error: undefined,
                };
              } catch (error) {
                hasFailures = true;
                return {
                  query,
                  valid: false,
                  status: 'Failed to add',
                  error: getErrorMessage(error),
                };
              }
            })
          );
          if (hasFailures) {
            toolUsage.add_queries.failures += 1;
          }
          toolUsage.add_queries.latency_ms += Date.now() - startTime;

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
    if (message.role === MessageRole.Tool && message.name === 'add_queries') {
      return message.response.queries.flatMap(({ valid, query }) => (valid ? [query] : []));
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
