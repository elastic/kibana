/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSampleDocuments,
  mergeSampleDocumentsWithFieldCaps,
  sortAndTruncateAnalyzedFields,
} from '@kbn/ai-tools';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BoundInferenceClient, MessageRole, callPromptUntil } from '@kbn/inference-common';
import { ProcessorDefinitionWithId, Streams } from '@kbn/streams-schema';
import { ValuesType } from 'utility-types';
import { format } from 'util';
import { schema } from './processing_schema';
import { GenerateProcessorsPrompt } from './prompt';
import { ValidateProcessorsCallback } from './validate_processor_callback';
import { clusterDocs } from '../../../tools/cluster_logs/cluster_logs/cluster_docs';

export async function generateProcessors({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  signal,
  validateProcessors,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
  validateProcessors: ValidateProcessorsCallback;
}): Promise<ProcessorDefinitionWithId[]> {
  const [{ hits, total }, fieldCaps] = await Promise.all([
    getSampleDocuments({
      esClient,
      index: definition.name,
      start,
      end,
      size: 1000,
      fields: [],
      _source: true,
    }),
    esClient.fieldCaps({
      index: definition.name,
      fields: '*',
      index_filter: {
        range: {
          '@timestamp': {
            gte: start,
            lte: end,
            format: 'epoch_millis',
          },
        },
      },
    }),
  ]);

  const sampleData = sortAndTruncateAnalyzedFields(
    mergeSampleDocumentsWithFieldCaps({
      fieldCaps,
      hits,
      total,
    }),
    {
      dropEmpty: true,
    }
  );

  const samples = JSON.stringify(
    clusterDocs({
      hits,
      fieldCaps,
      logger,
    }).clusters.flatMap((cluster) => cluster.samples.slice(0, 5).map((sample) => sample._source))
  );

  const messages = await callPromptUntil({
    inferenceClient,
    prompt: GenerateProcessorsPrompt,
    abortSignal: signal,
    input: {
      stream: definition,
      sample_data: JSON.stringify(sampleData),
      sample_documents: samples,
      existing_processors: JSON.stringify(definition.ingest.processing),
      processor_schema: JSON.stringify(schema),
    },
    strategy: 'next',
    toolCallbacks: {
      suggest_processors: async (toolCall) => {
        return await validateProcessors({
          samples: hits,
          processors: toolCall.function.arguments.processors.map(({ id, config }) => {
            return {
              ...config,
              id,
            } as ProcessorDefinitionWithId;
          }),
        }).catch((error) => {
          return {
            error: format(error),
          };
        });
      },
    },
  });

  const lastMessageWithToolCall = messages.findLast(
    (message): message is Extract<ValuesType<typeof messages>, { role: MessageRole.Assistant }> => {
      return message.role === MessageRole.Assistant && message.toolCalls?.length > 0;
    }
  );

  const processors = lastMessageWithToolCall?.toolCalls[0].function.arguments.processors.map(
    (processor) => ({
      ...processor.config,
      id: processor.id,
    })
  ) as ProcessorDefinitionWithId[] | undefined;

  return processors ?? [];
}
