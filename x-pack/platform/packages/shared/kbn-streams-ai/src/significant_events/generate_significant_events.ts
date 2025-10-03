/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, System } from '@kbn/streams-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MessageRole, type BoundInferenceClient } from '@kbn/inference-common';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { fromKueryExpression } from '@kbn/es-query';
import { GenerateSignificantEventsPrompt } from './prompt';
import type { SignificantEventType } from './types';

/**
 * Generate significant event definitions, based on:
 * - the description of the system (or stream if system is undefined)
 * - dataset analysis
 * - for the given significant event types
 */
export async function generateSignificantEvents({
  stream,
  system,
  start,
  end,
  esClient,
  inferenceClient,
  logger,
}: {
  stream: Streams.all.Definition;
  system?: System;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
}): Promise<{
  queries: Array<{
    title: string;
    kql: string;
    category: SignificantEventType;
  }>;
}> {
  const analysis = await describeDataset({
    start,
    end,
    esClient,
    index: stream.name,
    filter: system?.filter ? conditionToQueryDsl(system.filter) : undefined,
  });

  const response = await executeAsReasoningAgent({
    input: {
      name: system?.name || stream.name,
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true })
      ),
      description: system?.description || stream.description,
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
  });

  const queries = response.input.flatMap((message) => {
    if (message.role === MessageRole.Assistant) {
      return message.toolCalls.flatMap((toolCall) => {
        return toolCall.function.arguments.queries;
      });
    }
    return [];
  });

  return { queries };
}
