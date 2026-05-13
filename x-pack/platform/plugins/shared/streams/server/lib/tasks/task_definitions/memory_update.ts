/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorForSignificantEventsDiscovery } from '../../../routes/utils/resolve_connector_for_feature';
import { MemoryServiceImpl } from '../../memory';
import { MemoryTriggerRegistry } from '../../memory/triggers';
import { discoveryCompletedTrigger } from '../../memory/triggers';

export interface MemoryUpdateTaskParams {
  triggerId: string;
  payload: Record<string, unknown>;
}

export interface MemoryUpdateTaskResult {
  triggerId: string;
  success: boolean;
}

export const MEMORY_UPDATE_TASK_TYPE = 'streams_memory_update';

export function createStreamsMemoryUpdateTask(taskContext: TaskContext) {
  return {
    [MEMORY_UPDATE_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { triggerId, payload, _task } = runContext.taskInstance
                .params as TaskParams<MemoryUpdateTaskParams>;

              const taskLogger = taskContext.logger.get('memory_update');

              taskLogger.info(
                `Starting memory update task for trigger "${triggerId}" (task ${runContext.taskInstance.id})`
              );

              const {
                taskClient,
                inferenceClient,
                uiSettingsClient,
                insightClient,
                scopedClusterClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const useMemory = await uiSettingsClient.get<boolean>(
                OBSERVABILITY_STREAMS_ENABLE_MEMORY
              );
              if (!useMemory) {
                taskLogger.info('Memory is disabled, skipping memory update');
                await taskClient.complete<MemoryUpdateTaskParams, MemoryUpdateTaskResult>(
                  _task,
                  { triggerId, payload },
                  { triggerId, success: true }
                );
                return;
              }

              const connectorId = await resolveConnectorForSignificantEventsDiscovery({
                searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                request: runContext.fakeRequest,
              });

              taskLogger.info(
                `Resolved connector ${connectorId} (discovery model) for memory update trigger "${triggerId}"`
              );

              const boundInferenceClient = inferenceClient.bindTo({ connectorId });

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              // Create a local trigger registry for this task execution
              const registry = new MemoryTriggerRegistry({ logger: taskLogger });
              registry.register(discoveryCompletedTrigger);

              try {
                taskLogger.info(
                  `Executing trigger "${triggerId}" with payload keys: ${Object.keys(payload).join(
                    ', '
                  )}`
                );

                await registry.execute(triggerId, {
                  memory,
                  logger: taskLogger,
                  inferenceClient: boundInferenceClient,
                  esClient: scopedClusterClient.asCurrentUser,
                  insightClient,
                  payload,
                  abortSignal: runContext.abortController.signal,
                });

                taskLogger.info(`Memory update trigger "${triggerId}" completed successfully`);

                await taskClient.complete<MemoryUpdateTaskParams, MemoryUpdateTaskResult>(
                  _task,
                  { triggerId, payload },
                  { triggerId, success: true }
                );
              } catch (error) {
                const errorMessage = getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  taskLogger.info(`Memory update trigger "${triggerId}" was canceled`);
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Memory update trigger "${triggerId}" failed: ${errorMessage}`);

                await taskClient.fail<MemoryUpdateTaskParams>(
                  _task,
                  { triggerId, payload },
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
