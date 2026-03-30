/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorId } from '../../../routes/utils/resolve_connector_id';
import { MemoryServiceImpl } from '../../memory';
import { createAskQuestionCallback } from '../../memory/ask_question_tool';
import { MemoryConsolidationPrompt } from './memory_consolidation_prompt';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MemoryConsolidationTaskParams {}

export interface MemoryConsolidationTaskResult {
  entriesProcessed: number;
}

export const MEMORY_CONSOLIDATION_TASK_TYPE = 'streams_memory_consolidation';

export function createStreamsMemoryConsolidationTask(taskContext: TaskContext) {
  return {
    [MEMORY_CONSOLIDATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { _task } = runContext.taskInstance
                .params as TaskParams<MemoryConsolidationTaskParams>;

              const { taskClient, inferenceClient, modelSettingsClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('memory_consolidation');

              const settings = await modelSettingsClient.getSettings();

              if (!settings.useMemory) {
                taskLogger.info('Memory is disabled, skipping memory consolidation');
                if (_task) {
                  await taskClient.complete<
                    MemoryConsolidationTaskParams,
                    MemoryConsolidationTaskResult
                  >(_task, {}, { entriesProcessed: 0 });
                }
                return;
              }

              const connectorId = await resolveConnectorId({
                connectorId: settings.connectorIdDiscovery,
                uiSettingsClient,
                logger: taskLogger,
              });

              taskLogger.info(`Using connector ${connectorId} for memory consolidation`);

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              try {
                const allEntries = await memory.listAll();

                // Filter out system entries
                const entries = allEntries.filter((e) => !e.path.startsWith('_system/'));

                if (entries.length === 0) {
                  taskLogger.info('No memory entries to consolidate');
                  if (_task) {
                    await taskClient.complete<
                      MemoryConsolidationTaskParams,
                      MemoryConsolidationTaskResult
                    >(_task, {}, { entriesProcessed: 0 });
                  }
                  return;
                }

                taskLogger.info(
                  `Starting memory consolidation: ${entries.length} entries to review`
                );

                const existingPages = entries
                  .map(
                    (e) => `- **${e.path}** — ${e.title} (v${e.version}, updated ${e.updated_at})`
                  )
                  .join('\n');

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                await executeAsReasoningAgent({
                  inferenceClient: boundInferenceClient,
                  prompt: MemoryConsolidationPrompt,
                  input: {
                    entryCount: entries.length,
                    existingPages,
                  },
                  maxSteps: 30,
                  toolCallbacks: {
                    read_memory_page: async (toolCall) => {
                      const { path } = toolCall.function.arguments;
                      const entry = await memory.getByPath({ path });
                      if (!entry) {
                        return { response: { error: `No page found at path "${path}"` } };
                      }
                      return {
                        response: {
                          path: entry.path,
                          title: entry.title,
                          content: entry.content,
                          tags: entry.tags,
                          version: entry.version,
                          updated_at: entry.updated_at,
                          updated_by: entry.updated_by,
                        },
                      };
                    },

                    write_memory_page: async (toolCall) => {
                      const { path, title, content, tags } = toolCall.function.arguments;
                      const user = 'agent:memory_consolidation';

                      const existing = await memory.getByPath({ path });

                      if (existing) {
                        await memory.update({
                          id: existing.id,
                          content,
                          title,
                          tags,
                          user,
                          changeSummary: 'Updated during memory consolidation',
                        });
                        taskLogger.info(`Updated memory page: ${path}`);
                      } else {
                        await memory.create({
                          path,
                          title,
                          content,
                          tags: [...(tags ?? []), 'auto-generated'],
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

                    get_recent_changes: async (toolCall) => {
                      const { size } = toolCall.function.arguments;
                      const changes = await memory.getRecentChanges({
                        size: typeof size === 'number' ? size : 20,
                      });
                      return {
                        response: {
                          total: changes.length,
                          changes: changes.map((c) => ({
                            path: c.path,
                            title: c.title,
                            version: c.version,
                            change_type: c.change_type,
                            change_summary: c.change_summary,
                            created_by: c.created_by,
                            created_at: c.created_at,
                          })),
                        },
                      };
                    },

                    ask_question: createAskQuestionCallback({
                      memory,
                      logger: taskLogger,
                      user: 'agent:memory_consolidation',
                    }),

                    delete_memory_page: async (toolCall) => {
                      const { path } = toolCall.function.arguments;
                      const user = 'agent:memory_consolidation';

                      const entry = await memory.getByPath({ path });
                      if (!entry) {
                        return { response: { error: `No page found at path "${path}"` } };
                      }

                      await memory.delete({ id: entry.id, user });
                      taskLogger.info(`Deleted memory page: ${path}`);

                      return {
                        response: { success: true, deleted: path },
                      };
                    },
                  },
                });

                taskLogger.info(
                  `Memory consolidation completed: reviewed ${entries.length} entries`
                );

                if (_task) {
                  await taskClient.complete<
                    MemoryConsolidationTaskParams,
                    MemoryConsolidationTaskResult
                  >(_task, {}, { entriesProcessed: entries.length });
                }
              } catch (error) {
                const errorMessage = getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Memory consolidation failed: ${errorMessage}`);

                if (_task) {
                  await taskClient.fail<MemoryConsolidationTaskParams>(_task, {}, errorMessage);
                }

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
