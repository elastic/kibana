/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  AssistantMessage,
  AssistantMessageOf,
  BoundInferenceClient,
  ToolCallbacksOf,
  ToolDefinition,
  ToolOptions,
  callPromptUntil,
  truncateList,
} from '@kbn/inference-common';
import { EsqlDocumentBase, runAndValidateEsqlQuery } from '@kbn/inference-plugin/server';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { once } from 'lodash';
import { EsqlPrompt } from './prompt';

const loadEsqlDocBase = once(() => EsqlDocumentBase.load());

export async function answerAsEsqlExpert<TTools extends Record<string, ToolDefinition> | undefined>(
  options: {
    inferenceClient: BoundInferenceClient;
    esClient: ElasticsearchClient;
    logger: Logger;
    start: number;
    end: number;
    signal: AbortSignal;
    prompt: string;
    tools?: TTools;
  } & (TTools extends Record<string, ToolDefinition>
    ? { toolCallbacks: ToolCallbacksOf<{ tools: TTools }> }
    : {})
): Promise<AssistantMessageOf<{ tools: TTools }> | undefined>;

export async function answerAsEsqlExpert({
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  signal,
  prompt,
  tools,
  toolCallbacks,
}: {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
  prompt: string;
  tools?: Record<string, ToolDefinition>;
  toolCallbacks?: ToolCallbacksOf<ToolOptions>;
}): Promise<AssistantMessage | undefined> {
  const docBase = await loadEsqlDocBase();

  const assistantReply = await callPromptUntil({
    inferenceClient,
    prompt: EsqlPrompt,
    abortSignal: signal,
    strategy: 'next',
    logger,
    tools,
    toolCallbacks: {
      ...toolCallbacks,
      list_datasets: async (toolCall) => {
        return esClient.indices
          .resolveIndex({
            name: toolCall.function.arguments.name.flatMap((index) => index.split(',')),
            allow_no_indices: true,
          })
          .then((response) => {
            return {
              ...response,
              data_streams: response.data_streams.map((dataStream) => {
                return {
                  name: dataStream.name,
                  timestamp_field: dataStream.timestamp_field,
                };
              }),
            };
          });
      },
      describe_dataset: async (toolCall) => {
        const analysis = await describeDataset({
          esClient,
          index: toolCall.function.arguments.index,
          kql: toolCall.function.arguments.kql,
          start,
          end,
        });

        return {
          analysis: sortAndTruncateAnalyzedFields(analysis),
        };
      },
      get_documentation: async (toolCall) => {
        return docBase.getDocumentation(
          toolCall.function.arguments.commands.concat(toolCall.function.arguments.functions),
          { generateMissingKeywordDoc: true }
        );
      },
      validate_queries: async (toolCall) => {
        const results = await Promise.all(
          toolCall.function.arguments.queries.map(async (query) => {
            return {
              query,
              validation: await runAndValidateEsqlQuery({
                query: query + `\n| LIMIT 0`,
                client: esClient,
              }).then((response) => {
                if (response.error || response.errorMessages?.length) {
                  return {
                    error: response.error,
                    errorMessages: response.errorMessages,
                  };
                }

                const cols = truncateList(response.columns?.map((col) => col.name) ?? [], 10);
                return {
                  valid: true,
                  ...(cols.length ? { columns: cols } : {}),
                };
              }),
            };
          })
        );

        return {
          results,
        };
      },
    },
    input: {
      prompt,
      esql_system_prompt: docBase.getSystemMessage(),
    },
  });

  return assistantReply;
}
