/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorForSignificantEventsDiscovery } from '../../../routes/utils/resolve_connector_for_feature';
import {
  MemoryServiceImpl,
  formatExistingPages,
  createReadMemoryPageCallback,
  createWriteMemoryPageCallback,
} from '../../memory';
import { MemoryConsolidationPrompt } from './memory_consolidation_prompt';

export type MemoryConsolidationTaskParams = Record<string, never>;

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

              const { taskClient, inferenceClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('memory_consolidation');

              const useMemory = await uiSettingsClient.get<boolean>(
                OBSERVABILITY_STREAMS_ENABLE_MEMORY
              );

              if (!useMemory) {
                taskLogger.info('Memory is disabled, skipping memory consolidation');
                if (_task) {
                  await taskClient.complete<
                    MemoryConsolidationTaskParams,
                    MemoryConsolidationTaskResult
                  >(_task, {}, { entriesProcessed: 0 });
                }
                return;
              }

              const connectorId = await resolveConnectorForSignificantEventsDiscovery({
                searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                request: runContext.fakeRequest,
              });

              taskLogger.info(
                `Using connector ${connectorId} for memory consolidation (discovery model)`
              );

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              try {
                const allEntries = await memory.listAll();

                // Filter out system entries
                const entries = allEntries.filter((e) => !e.name.startsWith('_system/'));

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

                const existingPages = formatExistingPages(entries);

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                await executeAsReasoningAgent({
                  inferenceClient: boundInferenceClient,
                  prompt: MemoryConsolidationPrompt,
                  input: {
                    entryCount: entries.length,
                    existingPages,
                  },
                  maxSteps: 30,
                  abortSignal: runContext.abortController.signal,
                  toolCallbacks: {
                    read_memory_page: createReadMemoryPageCallback({ memory }),

                    write_memory_page: createWriteMemoryPageCallback({
                      memory,
                      user: 'agent:memory_consolidation',
                      logger: taskLogger,
                      changeSummary: 'Updated during memory consolidation',
                    }),

                    get_recent_changes: async (toolCall) => {
                      const { size } = toolCall.function.arguments;
                      const changes = await memory.getRecentChanges({
                        size: typeof size === 'number' ? size : 20,
                      });
                      return {
                        response: {
                          total: changes.length,
                          changes: changes.map((c) => ({
                            name: c.name,
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

                    delete_memory_page: async (toolCall) => {
                      const { name } = toolCall.function.arguments;
                      const user = 'agent:memory_consolidation';

                      const entry = await memory.getByName({ name });
                      if (!entry) {
                        return { response: { error: `No page found with name "${name}"` } };
                      }

                      await memory.delete({ id: entry.id, user });
                      taskLogger.info(`Deleted memory page: ${name}`);

                      return {
                        response: { success: true, deleted: name },
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
