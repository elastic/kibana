/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, Streams, System } from '@kbn/streams-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { FormattedDocumentAnalysis } from '@kbn/ai-tools';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { dateRangeQuery, fromKueryExpression, getKqlFieldNamesFromExpression } from '@kbn/es-query';
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
  kql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Given a list of field names extracted from a KQL expression and a set of
 * mapped fields, returns the subset of field names that do not match any
 * mapped field. Wildcard patterns (e.g. `server.*`) are matched against all
 * mapped fields using regex conversion.
 */
export const getUnmappedFields = (fieldNames: string[], mappedFields: Set<string>): string[] => {
  return fieldNames.filter((fieldName) => {
    if (fieldName.includes('*')) {
      const regex = new RegExp('^' + fieldName.replace(/\*/g, '.*') + '$');
      return !Array.from(mappedFields).some((mapped) => regex.test(mapped));
    }
    return !mappedFields.has(fieldName);
  });
};

/**
 * Generate significant event definitions, based on:
 * - the description of the system (or stream if system is undefined)
 * - dataset analysis
 * - for the given significant event types
 */
export async function generateSignificantEvents({
  stream,
  system,
  esClient,
  start,
  end,
  getFeatures,
  inferenceClient,
  signal,
  sampleDocsSize,
  systemPrompt,
  logger,
}: {
  stream: Streams.all.Definition;
  system?: System;
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
  sampleDocsSize?: number;
  systemPrompt: string;
}): Promise<{
  queries: Query[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
}> {
  logger.debug('Starting significant event generation');

  const toolUsage = createDefaultSignificantEventsToolUsage();
  let formattedAnalysis: FormattedDocumentAnalysis | undefined;

  if (system?.filter) {
    logger.trace('Describing dataset for significant event generation (with filter)');
    const analysis = await withSpan('describe_dataset_for_significant_event_generation', () =>
      describeDataset({
        sampleDocsSize,
        start,
        end,
        esClient,
        index: stream.name,
        filter: conditionToQueryDsl(system.filter),
      })
    );
    formattedAnalysis = formatDocumentAnalysis(analysis, { dropEmpty: true });
  }

  const fieldCapsResponse = await esClient
    .fieldCaps({
      index: stream.name,
      fields: '*',
      index_filter: {
        bool: {
          filter: dateRangeQuery(start, end),
        },
      },
    })
    .catch((error) => {
      throw new Error(
        `Failure to retrieve mappings to determine field eligibility: ${error.message}`
      );
    });

  const mappedFields = new Set(Object.keys(fieldCapsResponse.fields));
  const prompt = createGenerateSignificantEventsPrompt({ systemPrompt });

  logger.trace('Generating significant events via reasoning agent');
  const response = await withSpan('generate_significant_events', () =>
    executeAsReasoningAgent({
      input: {
        name: system?.name || stream.name,
        description: system?.description || stream.description,
        dataset_analysis: formattedAnalysis ? JSON.stringify(formattedAnalysis) : '',
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

          const queryValidationResults = queries.map((query) => {
            try {
              fromKueryExpression(query.kql);

              const fieldNames = getKqlFieldNamesFromExpression(query.kql);
              const unmappedFields = getUnmappedFields(fieldNames, mappedFields);

              if (unmappedFields.length > 0) {
                hasFailures = true;
                return {
                  query,
                  valid: false,
                  status: 'Failed to add',
                  error: `Query references unmapped fields: ${unmappedFields.join(
                    ', '
                  )}. Use only fields that are tagged with (mapped) in the dataset_analysis.`,
                };
              }

              return {
                query,
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
          });
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
