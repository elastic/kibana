/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  BoundInferenceClient,
  PromptResponse,
  ToolCallbacksOf,
  ToolDefinition,
  ToolOptions,
  truncateList,
} from '@kbn/inference-common';
import { PromptCompositeResponse, PromptOptions } from '@kbn/inference-common/src/prompt/api';
import { EsqlDocumentBase, runAndValidateEsqlQuery } from '@kbn/inference-plugin/server';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { omit, once } from 'lodash';
import moment from 'moment';
import { describeDataset, sortAndTruncateAnalyzedFields } from '../../..';
import { EsqlPrompt } from './prompt';

const loadEsqlDocBase = once(() => EsqlDocumentBase.load());

export async function executeAsEsqlAgent<TTools extends Record<string, ToolDefinition> | undefined>(
  options: {
    inferenceClient: BoundInferenceClient;
    esClient: ElasticsearchClient;
    logger: Logger;
    start?: number;
    end?: number;
    signal: AbortSignal;
    prompt: string;
    tools?: TTools;
  } & (TTools extends Record<string, ToolDefinition>
    ? { toolCallbacks: ToolCallbacksOf<{ tools: TTools }> }
    : {})
): PromptCompositeResponse<PromptOptions<typeof EsqlPrompt> & { tools: TTools; stream: false }>;

export async function executeAsEsqlAgent({
  inferenceClient,
  esClient,
  start,
  end,
  signal,
  prompt,
  tools,
  toolCallbacks,
}: {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  start?: number;
  end?: number;
  signal: AbortSignal;
  prompt: string;
  tools?: Record<string, ToolDefinition>;
  toolCallbacks?: ToolCallbacksOf<ToolOptions>;
}): Promise<PromptResponse> {
  const docBase = await loadEsqlDocBase();

  async function runEsqlQuery(query: string) {
    return await runAndValidateEsqlQuery({
      query,
      client: esClient,
    }).then((response) => {
      if (response.error || response.errorMessages?.length) {
        return {
          error:
            response.error && response.error instanceof errors.ResponseError
              ? omit(response.error, 'meta')
              : response.error,
          errorMessages: response.errorMessages,
        };
      }

      return {
        columns: response.columns,
        rows: response.rows,
      };
    });
  }

  const assistantReply = await executeAsReasoningAgent({
    inferenceClient,
    prompt: EsqlPrompt,
    abortSignal: signal,
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
          start: start ?? moment().subtract(24, 'hours').valueOf(),
          end: Date.now(),
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
      run_queries: async (toolCall) => {
        const results = await Promise.all(
          toolCall.function.arguments.queries.map(async (query) => {
            const response = await runEsqlQuery(query);

            const cols = response.columns ?? [];
            const docs =
              response.rows?.map((row) => {
                const doc: Record<string, any> = {};
                row.forEach((value, idx) => {
                  const col = cols[idx];
                  if (value !== null) {
                    doc[col.name] = value;
                  }
                });
              }) ?? [];

            return {
              query,
              response: {
                docs: truncateList(docs, 50),
              },
            };
          })
        );

        return {
          queries: results,
        };
      },
      validate_queries: async (toolCall) => {
        const results = await Promise.all(
          toolCall.function.arguments.queries.map(async (query) => {
            return {
              query,
              validation: await runEsqlQuery(query + ' | LIMIT 0').then((response) => {
                if ('error' in response) {
                  return {
                    valid: false,
                    ...response,
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
