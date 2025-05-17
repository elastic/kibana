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
import { v4 } from 'uuid';
import { format } from 'util';
import { ValidateProcessorsCallback } from '../generate_processors/validate_processor_callback';
import { extractAndGroupPatterns } from './extract_and_group_patterns';
import { schema } from './processing_schema';
import { GenerateParsersPrompt } from './prompt';

export async function generateParsers({
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
  const [{ hits, total }, fieldCaps, grokPatterns] = await Promise.all([
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
    esClient.transport.request({
      path: '/_ingest/processor/grok',
      querystring: 'ecs_compatibility=v1',
      method: 'GET',
    }) as Promise<{
      patterns: Record<string, string>;
    }>,
  ]);

  const analysis = sortAndTruncateAnalyzedFields(
    mergeSampleDocumentsWithFieldCaps({
      total,
      fieldCaps,
      hits,
    }),
    { dropEmpty: true }
  );

  const groupedPatterns = extractAndGroupPatterns(
    hits.map((hit) => ({ message: String(hit._source?.message) })),
    'message'
  );

  const messages = await callPromptUntil({
    inferenceClient,
    prompt: GenerateParsersPrompt,
    abortSignal: signal,
    strategy: 'next',
    input: {
      stream: {
        name: definition.name,
      },
      sample_data: JSON.stringify(analysis),
      // available_grok_patterns: JSON.stringify(grokPatterns.patterns),
      grouped_messages: JSON.stringify(
        groupedPatterns.map((pattern) => {
          return {
            ...pattern,
            exampleValues: pattern.exampleValues.map((value) => ({ message: value })).slice(0, 1),
          };
        })
      ),
      existing_processors: JSON.stringify(definition.ingest.processing),
      processor_schema: JSON.stringify(schema),
    },
    toolCallbacks: {
      suggest_parsing_rule: async (toolCall) => {
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
      return (
        message.role === MessageRole.Assistant &&
        message.toolCalls.length > 0 &&
        message.toolCalls.some((toolCall) => toolCall.function.name === 'suggest_parsing_rule')
      );
    }
  );

  const processors = lastMessageWithToolCall?.toolCalls[0].function.arguments.processors.map(
    (processor) => ({ id: processor.id, ...processor.config })
  ) as ProcessorDefinitionWithId[] | undefined;

  if (!!processors?.length) {
    return [
      ...processors,
      {
        id: v4(),
        dot_expander: {
          field: '*',
        },
      },
    ];
  }

  return processors ?? [];
}
