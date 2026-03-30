/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { BaseFeature, GeneratedSignificantEventQuery, Insight } from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorId } from '../../../routes/utils/resolve_connector_id';
import { MemoryServiceImpl } from '../../memory';
import { createAskQuestionCallback } from '../../memory/ask_question_tool';
import { MemorySynthesisPrompt, QuestionAnswerPrompt } from './memory_generation_prompt';

export interface QuestionContext {
  question: string;
  answer: string;
  relatedEntryIds: string[];
}

export interface MemoryGenerationTaskParams {
  insights?: Insight[];
  features?: BaseFeature[];
  queries?: Array<{ streamName: string; query: GeneratedSignificantEventQuery }>;
  questionContext?: QuestionContext;
}

export interface MemoryGenerationTaskResult {
  streamsProcessed: number;
}

export const MEMORY_GENERATION_TASK_TYPE = 'streams_memory_generation';

export function createStreamsMemoryGenerationTask(taskContext: TaskContext) {
  return {
    [MEMORY_GENERATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { insights, features, queries, questionContext, _task } = runContext
                .taskInstance.params as TaskParams<MemoryGenerationTaskParams>;

              const { taskClient, inferenceClient, modelSettingsClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('memory_generation');

              // ── Question-answer flow ──
              // When questionContext is present, the task was triggered by a user
              // answering a question. Run a reasoning agent that incorporates the
              // answer into the relevant memory pages.
              if (questionContext) {
                taskLogger.info(
                  `Processing answered question with ${questionContext.relatedEntryIds.length} related entries`
                );

                const settings = await modelSettingsClient.getSettings();
                const connectorId = await resolveConnectorId({
                  connectorId: settings.connectorIdDiscovery,
                  uiSettingsClient,
                  logger: taskLogger,
                });

                const memory = new MemoryServiceImpl({
                  logger: taskLogger.get('memory'),
                  esClient: taskContext.getInternalEsClient(),
                });

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                const allEntries = await memory.listAll();
                const entryMap = new Map(allEntries.map((e) => [e.id, e]));

                const entryIndex = allEntries
                  .map((e) => `- [${e.id}] ${e.path} — "${e.title}" (tags: ${e.tags.join(', ')})`)
                  .join('\n');

                const relatedEntryIds = questionContext.relatedEntryIds.join(', ');

                await executeAsReasoningAgent({
                  inferenceClient: boundInferenceClient,
                  prompt: QuestionAnswerPrompt,
                  input: {
                    question: questionContext.question,
                    answer: questionContext.answer,
                    entry_index: entryIndex,
                    related_entry_ids: relatedEntryIds,
                  },
                  maxSteps: 8,
                  toolCallbacks: {
                    read_entry: async (toolCall) => {
                      const { entry_id: entryId } = toolCall.function.arguments;
                      const entry = entryMap.get(entryId);
                      if (!entry) {
                        return { response: { error: `Entry ${entryId} not found` } };
                      }
                      return {
                        response: {
                          id: entry.id,
                          path: entry.path,
                          title: entry.title,
                          tags: entry.tags,
                          content: entry.content,
                        },
                      };
                    },
                    write_memory_page: async (toolCall) => {
                      const { path, title, content } = toolCall.function.arguments;
                      const user = 'agent:question_answer';

                      const existing = await memory.getByPath({ path });

                      if (existing) {
                        await memory.update({
                          id: existing.id,
                          content,
                          title,
                          user,
                          changeSummary: `Updated based on answered question: "${questionContext.question}"`,
                        });
                        taskLogger.info(`Updated memory page: ${path}`);
                      } else {
                        await memory.create({
                          path,
                          title,
                          content,
                          tags: ['auto-generated'],
                          user,
                        });
                        taskLogger.info(`Created memory page: ${path}`);
                      }

                      return {
                        response: {
                          success: true,
                          action: existing ? 'updated' : 'created',
                          path,
                        },
                      };
                    },
                    delete_entry: async (toolCall) => {
                      const { entry_id: entryId } = toolCall.function.arguments;
                      const entry = entryMap.get(entryId);
                      if (!entry) {
                        return { response: { error: `Entry ${entryId} not found` } };
                      }
                      await memory.delete({ id: entryId, user: 'agent:question_answer' });
                      taskLogger.info(`Deleted entry ${entryId}: ${entry.path}`);
                      return { response: { success: true, deleted: entry.path } };
                    },
                  },
                });

                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { questionContext },
                  { streamsProcessed: 0 }
                );
                return;
              }

              // ── Normal synthesis flow ──
              const streamGroups = groupInputsByStream({ insights, features, queries });

              if (streamGroups.length === 0) {
                taskLogger.info('No inputs provided, skipping memory generation');
                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights, features, queries },
                  { streamsProcessed: 0 }
                );
                return;
              }

              taskLogger.info(
                `Starting memory generation: ${streamGroups.length} stream(s), ` +
                  `${insights?.length ?? 0} insight(s), ` +
                  `${features?.length ?? 0} feature(s), ` +
                  `${queries?.length ?? 0} query/queries`
              );

              const settings = await modelSettingsClient.getSettings();
              const connectorId = await resolveConnectorId({
                connectorId: settings.connectorIdDiscovery,
                uiSettingsClient,
                logger: taskLogger,
              });
              taskLogger.info(`Using connector ${connectorId} for memory generation`);

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              try {
                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                for (const { streamName, indicators } of streamGroups) {
                  taskLogger.info(
                    `Processing stream "${streamName}" with ${indicators.length} indicator(s) via reasoning agent`
                  );

                  const indicatorSummaries = buildIndicatorSummaries(indicators);

                  const allEntries = await memory.listAll();
                  const existingEntries = allEntries.filter(
                    (e) =>
                      e.path.startsWith(`architecture/${streamName}/`) ||
                      e.path.startsWith(`operations/${streamName}/`)
                  );

                  const existingPages =
                    existingEntries.length > 0
                      ? existingEntries.map((e) => `- **${e.path}** — ${e.title}`).join('\n')
                      : 'No existing pages for this stream.';

                  taskLogger.info(
                    `Found ${existingEntries.length} existing memory entries for stream "${streamName}"`
                  );

                  let pagesWritten = 0;

                  const response = await executeAsReasoningAgent({
                    inferenceClient: boundInferenceClient,
                    prompt: MemorySynthesisPrompt,
                    input: {
                      streamName,
                      indicatorCount: indicators.length,
                      indicatorSummaries,
                      existingPages,
                    },
                    maxSteps: 10,
                    toolCallbacks: {
                      get_indicator_details: async (toolCall) => {
                        const { index } = toolCall.function.arguments;
                        taskLogger.info(
                          `Stream "${streamName}": agent requesting indicator details for index ${index}`
                        );

                        if (typeof index !== 'number' || index < 0 || index >= indicators.length) {
                          return {
                            response: {
                              error: `Invalid index ${index}. Valid range: 0-${
                                indicators.length - 1
                              }`,
                            },
                          };
                        }

                        return {
                          response: indicators[index] as Record<string, unknown>,
                        };
                      },

                      read_memory_page: async (toolCall) => {
                        const { path } = toolCall.function.arguments;
                        taskLogger.info(
                          `Stream "${streamName}": agent reading memory page "${path}"`
                        );

                        const entry = await memory.getByPath({ path });
                        if (!entry) {
                          return {
                            response: { error: `No page found at path "${path}"` },
                          };
                        }

                        return {
                          response: {
                            path: entry.path,
                            title: entry.title,
                            content: entry.content,
                          },
                        };
                      },

                      ask_question: createAskQuestionCallback({
                        memory,
                        logger: taskLogger,
                        user: 'agent:memory_generation',
                      }),

                      write_memory_page: async (toolCall) => {
                        const { path, title, content, tags } = toolCall.function.arguments;
                        const user = 'agent:memory_generation';

                        const existing = await memory.getByPath({ path });

                        if (existing) {
                          await memory.update({
                            id: existing.id,
                            content,
                            title,
                            user,
                            changeSummary: 'Updated from discovery indicators',
                          });
                          taskLogger.info(`Updated existing wiki page: ${path}`);
                        } else {
                          await memory.create({
                            path,
                            title,
                            content,
                            tags: [...(tags ?? []), 'auto-generated'],
                            user,
                          });
                          taskLogger.info(`Created new wiki page: ${path}`);
                        }

                        pagesWritten++;

                        return {
                          response: {
                            success: true,
                            action: existing ? 'updated' : 'created',
                            path,
                          },
                        };
                      },
                    },
                  });

                  taskLogger.info(
                    `Reasoning agent completed for stream "${streamName}": ${pagesWritten} page(s) written, response length: ${response.content.length}`
                  );
                }

                taskLogger.info(
                  `Memory generation completed: processed ${streamGroups.length} stream(s)`
                );

                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights, features, queries },
                  { streamsProcessed: streamGroups.length }
                );
              } catch (error) {
                const errorMessage = getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`);

                await taskClient.fail<MemoryGenerationTaskParams>(
                  _task,
                  { insights, features, queries },
                  errorMessage
                );

                return getDeleteTaskRunResult();
              }
            },
            runContext,
            taskContext
          ),
        };
      },
    },
  } satisfies TaskDefinitionRegistry;
}

interface StreamIndicatorsGroup {
  streamName: string;
  indicators: unknown[];
}

const groupInputsByStream = ({
  insights,
  features,
  queries,
}: Pick<
  MemoryGenerationTaskParams,
  'insights' | 'features' | 'queries'
>): StreamIndicatorsGroup[] => {
  const byStream = new Map<string, unknown[]>();

  const addToStream = (streamName: string, item: unknown) => {
    const existing = byStream.get(streamName) ?? [];
    existing.push(item);
    byStream.set(streamName, existing);
  };

  for (const insight of insights ?? []) {
    const streamNames = new Set<string>();
    for (const evidence of insight.evidence ?? []) {
      if (evidence.stream_name) {
        streamNames.add(evidence.stream_name);
      }
    }
    for (const streamName of streamNames) {
      addToStream(streamName, insight);
    }
  }

  for (const feature of features ?? []) {
    addToStream(feature.stream_name, feature);
  }

  for (const { streamName, query } of queries ?? []) {
    addToStream(streamName, query);
  }

  return Array.from(byStream.entries()).map(([streamName, indicators]) => ({
    streamName,
    indicators,
  }));
};

/**
 * Build concise one-line summaries for each indicator so the LLM can
 * decide which ones to fetch details for. The index matches the array
 * position used by the `get_indicator_details` tool.
 */
const buildIndicatorSummaries = (indicators: unknown[]): string => {
  return indicators
    .map((indicator, index) => {
      const item = indicator as Record<string, unknown>;

      // Insight: has impact + evidence array
      if ('impact' in item && 'evidence' in item) {
        const title = String(item.title ?? 'Untitled insight');
        const impact = String(item.impact ?? 'unknown');
        return `[${index}] **Insight** (${impact}): ${title}`;
      }

      // Feature: has type + stream_name + confidence
      if ('type' in item && 'stream_name' in item && 'confidence' in item) {
        const title = String(item.title ?? item.id ?? 'Untitled feature');
        const type = String(item.type ?? 'unknown');
        const subtype = item.subtype ? `/${item.subtype}` : '';
        return `[${index}] **Feature** (${type}${subtype}): ${title}`;
      }

      // Query: has esql + severity_score
      if ('esql' in item && 'severity_score' in item) {
        const title = String(item.title ?? 'Untitled query');
        const severity = String(item.severity_score ?? '?');
        return `[${index}] **Query** (severity ${severity}): ${title}`;
      }

      return `[${index}] **Unknown indicator**: ${JSON.stringify(item).slice(0, 100)}`;
    })
    .join('\n');
};
