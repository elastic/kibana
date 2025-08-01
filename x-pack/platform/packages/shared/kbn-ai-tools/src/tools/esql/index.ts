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
import { castArray, once } from 'lodash';
import moment from 'moment';
import { indexPatternToCss } from '@kbn/std';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/common';
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
  logger,
}: {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  start?: number;
  end?: number;
  signal: AbortSignal;
  prompt: string;
  tools?: Record<string, ToolDefinition>;
  toolCallbacks?: ToolCallbacksOf<ToolOptions>;
  logger: Logger;
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
              ? {
                  message: response.error.message,
                  status: response.error.statusCode,
                }
              : {
                  message: response.error?.message,
                },
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
        const name = toolCall.function.arguments.name.flatMap((index) => index.split(','));

        if (toolCall.function.arguments.include_kibana_indices) {
          name.push(...indexPatternToCss('-.*'));
        }

        return esClient.indices
          .resolveIndex({
            name: toolCall.function.arguments.name.flatMap((index) => index.split(',')),
            allow_no_indices: true,
          })
          .catch((error) => {
            if (error instanceof errors.ResponseError && error.statusCode === 404) {
              return {
                data_streams: [],
                indices: [],
                aliases: [],
              };
            }
            throw error;
          })
          .then((response) => {
            const dataStreams = response.data_streams.map((dataStream) => {
              return {
                name: dataStream.name,
                timestamp_field: dataStream.timestamp_field,
              };
            });

            const aliases = response.aliases.map((alias) => {
              return {
                name: alias.name,
                ...(alias.indices ? { indices: truncateList(castArray(alias.indices), 5) } : {}),
              };
            });

            const allAliases = aliases.map((alias) => alias.name);

            const allDataStreamNames = dataStreams.map((dataStream) => dataStream.name);

            const indices = response.indices
              .filter((index) => {
                if (index.data_stream) {
                  const isRepresentedAsDataStream = allDataStreamNames.includes(index.data_stream);

                  return !isRepresentedAsDataStream;
                }

                if (index.aliases?.length) {
                  const isRepresentedAsAlias = index.aliases.some((alias) =>
                    allAliases.includes(alias)
                  );
                  return !isRepresentedAsAlias;
                }

                return true;
              })
              .map((index) => {
                return index.name;
              });

            return {
              indices: truncateList(indices, 250),
              data_streams: truncateList(
                response.data_streams.map((dataStream) => {
                  return `${dataStream.name} (${dataStream.timestamp_field})`;
                }),
                250
              ),
            };
          });
      },
      describe_dataset: async (toolCall) => {
        const analysis = await describeDataset({
          esClient,
          index: toolCall.function.arguments.index,
          kql: toolCall.function.arguments.kql,
          start: start ?? moment().subtract(24, 'hours').valueOf(),
          end: end ?? Date.now(),
        });

        return {
          analysis: sortAndTruncateAnalyzedFields(analysis),
        };
      },
      get_documentation: async (toolCall) => {
        return docBase.getDocumentation(
          (toolCall.function.arguments.commands ?? []).concat(
            toolCall.function.arguments.functions ?? []
          ),
          { generateMissingKeywordDoc: true }
        );
      },
      run_queries: async (toolCall) => {
        const mode = toolCall.function.arguments.mode ?? 'execute';

        const results = await Promise.all(
          toolCall.function.arguments.queries.map(async (originalQuery) => {
            const correction = correctCommonEsqlMistakes(
              mode === 'execute' ? originalQuery : `${originalQuery} | LIMIT 0`
            );

            const queryOutput = correction.isCorrection ? correction : originalQuery;

            const response = await runEsqlQuery(correction.output);

            switch (mode) {
              case 'validate': {
                if ('error' in response) {
                  return {
                    query: queryOutput,
                    validation: {
                      valid: false,
                      ...response,
                    },
                  };
                }

                const cols = truncateList(response.columns?.map((c) => c.name) ?? [], 10);
                return {
                  query: queryOutput,
                  validation: {
                    valid: true,
                    ...(cols.length ? { columns: cols } : {}),
                  },
                };
              }

              case 'validateSyntax': {
                if ('error' in response && response.errorMessages?.length) {
                  return {
                    query: queryOutput,
                    validation: {
                      valid: false,
                      errorMessages: response.errorMessages,
                    },
                  };
                }
                return {
                  query: queryOutput,
                  validation: {
                    valid: true,
                  },
                };
              }

              case 'execute':
              default: {
                if ('error' in response) {
                  return {
                    query: queryOutput,
                    ...response,
                  };
                }

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
                    return doc;
                  }) ?? [];

                return {
                  query: queryOutput,
                  response: {
                    docs: truncateList(docs, 50),
                  },
                };
              }
            }
          })
        );

        return {
          queries: results,
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
