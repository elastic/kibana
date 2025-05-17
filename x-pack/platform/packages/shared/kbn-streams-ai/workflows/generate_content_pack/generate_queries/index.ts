/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BoundInferenceClient, MessageRole, callPromptUntil } from '@kbn/inference-common';
import { NamedFieldDefinitionConfig, Streams } from '@kbn/streams-schema';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { GenerateQueriesPrompt } from './prompt';

export async function generateQueries({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  signal,
  suggestedQueries,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
  suggestedQueries: string[];
}): Promise<NamedFieldDefinitionConfig[]> {
  const messages = await callPromptUntil({
    inferenceClient,
    prompt: GenerateQueriesPrompt,
    abortSignal: signal,
    strategy: 'next',
    toolCallbacks: {
      generate_queries: async (toolCall) => {
        return {};
      },
    },
    input: {
      stream: {
        name: definition.name,
        description: definition.description,
      },
      suggested_queries: JSON.stringify(suggestedQueries),
      dataset_analysis: await describeDataset({
        esClient,
        start,
        end,
        index: definition.name,
      }).then((analysis) => {
        return JSON.stringify(sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true }));
      }),
    },
  });

  const lastToolCall = messages.findLast(
    (message): message is Extract<typeof message, { role: MessageRole.Assistant }> =>
      Boolean(
        message.role === MessageRole.Assistant &&
          message.toolCalls?.length &&
          message.toolCalls.some((toolCall) => toolCall.function.name === 'suggest_mappings')
      )
  );

  return (
    lastToolCall?.toolCalls.flatMap(
      (toolCall) => toolCall.function.arguments.fields as NamedFieldDefinitionConfig[]
    ) ?? []
  );
}
