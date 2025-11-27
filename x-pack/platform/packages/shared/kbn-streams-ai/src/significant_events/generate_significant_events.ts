/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, Feature } from '@kbn/streams-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MessageRole, type BoundInferenceClient } from '@kbn/inference-common';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { fromKueryExpression } from '@kbn/es-query';
import { GenerateSignificantEventsPrompt } from './prompt';
import type { SignificantEventType } from './types';

interface Query {
  kql: string;
  title: string;
  category: SignificantEventType;
}
/**
 * Generate significant event definitions, based on:
 * - the description of the feature (or stream if feature is undefined)
 * - dataset analysis
 * - for the given significant event types
 */
export async function generateSignificantEvents({
  stream,
  feature,
  start,
  end,
  esClient,
  inferenceClient,
  signal,
}: {
  stream: Streams.all.Definition;
  feature?: Feature;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{
  queries: Query[];
}> {
  const analysis = await describeDataset({
    start,
    end,
    esClient,
    index: stream.name,
    filter: feature?.filter ? conditionToQueryDsl(feature.filter) : undefined,
  });

  const response = await executeAsReasoningAgent({
    input: {
      name: feature?.name || stream.name,
      dataset_analysis: JSON.stringify(formatDocumentAnalysis(analysis, { dropEmpty: true })),
      description: feature?.description || stream.description,
    },
    maxSteps: 4,
    prompt: GenerateSignificantEventsPrompt,
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
  });

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

  return { queries };
}
