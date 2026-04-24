/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  IdentifyFeaturesResult,
  OnboardingResult,
  SignificantEventsQueriesGenerationResult,
  TaskResult,
} from '@kbn/streams-schema';
import { OnboardingStep, TaskStatus } from '@kbn/streams-schema';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LogMeta } from '@kbn/logging';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import type { StreamsTaskType, TaskContext } from '.';
import { getErrorMessage, parseError } from '../../streams/errors/parse_error';
import { persistQueries } from '../../sig_events/persist_queries';
import { cancellableTask } from '../cancellable_task';
import type { TaskClient } from '../task_client';
import type { TaskParams } from '../types';
import type { FeaturesIdentificationTaskParams } from './features_identification';
import {
  FEATURES_IDENTIFICATION_TASK_TYPE,
  getFeaturesIdentificationTaskId,
} from './features_identification';
import type { MemoryGenerationTaskParams } from './memory_generation';
import { MEMORY_GENERATION_TASK_TYPE } from './memory_generation';
import type { SignificantEventsQueriesGenerationTaskParams } from '../../sig_events/tasks/significant_events_queries_generation';
import {
  getSignificantEventsQueriesGenerationTaskId,
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
} from '../../sig_events/tasks/significant_events_queries_generation';

export interface OnboardingTaskParams {
  streamName: string;
  from: number;
  to: number;
  steps: OnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
}

export const STREAMS_ONBOARDING_TASK_TYPE = 'streams_onboarding';

export function getOnboardingTaskId(streamName: string) {
  return `${STREAMS_ONBOARDING_TASK_TYPE}_${streamName}`;
}

const FEATURES_IDENTIFICATION_RECENCY_MS = 12 * 60 * 60 * 1000; // 12 hours

async function areFeaturesUpToDate({
  taskClient,
  featuresTaskId,
}: {
  taskClient: TaskClient<StreamsTaskType>;
  featuresTaskId: string;
}) {
  const featuresTask = await taskClient.get<
    FeaturesIdentificationTaskParams,
    IdentifyFeaturesResult
  >(featuresTaskId);

  if (featuresTask.status !== TaskStatus.Completed) {
    return false;
  }

  return Boolean(
    featuresTask.last_completed_at &&
      Date.now() - new Date(featuresTask.last_completed_at).getTime() <
        FEATURES_IDENTIFICATION_RECENCY_MS
  );
}

export function createStreamsOnboardingTask(taskContext: TaskContext) {
  return {
    [STREAMS_ONBOARDING_TASK_TYPE]: {
      timeout: '60m',
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }
              const { fakeRequest } = runContext;

              const { streamName, from, to, steps, connectors, _task } = runContext.taskInstance
                .params as TaskParams<OnboardingTaskParams>;

              const { taskClient, getQueryClient, streamsClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: fakeRequest,
                });

              try {
                let featuresTaskResult: TaskResult<IdentifyFeaturesResult> | undefined;
                let queriesTaskResult:
                  | TaskResult<SignificantEventsQueriesGenerationResult>
                  | undefined;

                for (const step of steps) {
                  switch (step) {
                    case OnboardingStep.FeaturesIdentification: {
                      const featuresTaskId = getFeaturesIdentificationTaskId(streamName);
                      const isFeaturesOnlyStep =
                        steps.length === 1 && steps[0] === OnboardingStep.FeaturesIdentification;

                      if (
                        !isFeaturesOnlyStep &&
                        (await areFeaturesUpToDate({ taskClient, featuresTaskId }))
                      ) {
                        featuresTaskResult = await taskClient.getStatus<
                          FeaturesIdentificationTaskParams,
                          IdentifyFeaturesResult
                        >(featuresTaskId);
                      } else {
                        await scheduleFeaturesIdentificationTask(
                          {
                            start: from,
                            end: to,
                            streamName,
                            connectorId: connectors?.features,
                          },
                          taskClient,
                          fakeRequest
                        );

                        featuresTaskResult = await waitForSubtask<
                          FeaturesIdentificationTaskParams,
                          IdentifyFeaturesResult
                        >(
                          featuresTaskId,
                          runContext.taskInstance.id,
                          taskClient,
                          taskContext.logger
                        );
                      }

                      if (featuresTaskResult.status !== TaskStatus.Completed) {
                        return;
                      }
                      break;
                    }

                    case OnboardingStep.QueriesGeneration:
                      const queriesTaskId = await scheduleQueriesGenerationTask(
                        {
                          start: from,
                          end: to,
                          streamName,
                          connectorId: connectors?.queries,
                        },
                        taskClient,
                        fakeRequest
                      );

                      queriesTaskResult = await waitForSubtask<
                        SignificantEventsQueriesGenerationTaskParams,
                        SignificantEventsQueriesGenerationResult
                      >(queriesTaskId, runContext.taskInstance.id, taskClient, taskContext.logger);

                      if (queriesTaskResult.status !== TaskStatus.Completed) {
                        return;
                      }

                      await persistQueries(streamName, queriesTaskResult.queries, {
                        queryClient: await getQueryClient(),
                        streamsClient,
                      });
                      break;

                    default:
                      throw new Error(`No implementation for "${step}" onboarding step.`);
                  }
                }

                await taskClient.complete<OnboardingTaskParams, OnboardingResult>(
                  _task,
                  {
                    streamName,
                    from,
                    to,
                    steps,
                    connectors,
                  },
                  { featuresTaskResult, queriesTaskResult }
                );

                // Schedule memory generation from discovered features and queries
                const memoryParams: MemoryGenerationTaskParams = {};

                if (
                  featuresTaskResult?.status === TaskStatus.Completed &&
                  featuresTaskResult.features.length > 0
                ) {
                  memoryParams.features = featuresTaskResult.features;
                }

                if (
                  queriesTaskResult?.status === TaskStatus.Completed &&
                  queriesTaskResult.queries.length > 0
                ) {
                  memoryParams.queries = queriesTaskResult.queries.map((query) => ({
                    streamName,
                    query,
                  }));
                }

                const hasMemoryInputs =
                  (memoryParams.features?.length ?? 0) > 0 ||
                  (memoryParams.queries?.length ?? 0) > 0;

                const onboardingUseMemory = await uiSettingsClient.get<boolean>(
                  OBSERVABILITY_STREAMS_ENABLE_MEMORY
                );
                if (hasMemoryInputs && onboardingUseMemory && runContext.fakeRequest) {
                  try {
                    await taskClient.schedule<MemoryGenerationTaskParams>({
                      task: {
                        type: MEMORY_GENERATION_TASK_TYPE,
                        id: MEMORY_GENERATION_TASK_TYPE,
                        space: '*',
                      },
                      params: memoryParams,
                      request: runContext.fakeRequest,
                    });
                  } catch (scheduleError) {
                    taskContext.logger
                      .get('onboarding')
                      .warn(
                        `Failed to schedule memory generation: ${getErrorMessage(scheduleError)}`
                      );
                  }
                }
              } catch (error) {
                // Errors here originate from waitForSubtask (plain Error), not from inference calls.
                // isInferenceProviderError is always false, so no connector enrichment is needed.
                const errorMessage = parseError(error).message;

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`,
                  { error } as LogMeta
                );

                await taskClient.fail<OnboardingTaskParams>(
                  _task,
                  {
                    streamName,
                    from,
                    to,
                    steps,
                    connectors,
                  },
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

const SUBTASK_POLL_INTERVAL_MS = 2000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitForSubtask<TParams extends {} = {}, TPayload extends {} = {}>(
  subtaskId: string,
  parentTaskId: string,
  taskClient: TaskClient<StreamsTaskType>,
  logger: Logger
): Promise<TaskResult<TPayload>> {
  let lastStatus: TaskStatus | undefined;
  let pollCount = 0;
  const startedAt = Date.now();

  while (true) {
    pollCount++;
    const parentTask = await taskClient.get(parentTaskId);

    if (parentTask.status === TaskStatus.BeingCanceled) {
      await taskClient.cancel(subtaskId);
    }

    const result = await taskClient.getStatus<TParams, TPayload>(subtaskId);

    if (result.status !== lastStatus) {
      logger.debug(`Subtask ${subtaskId}: status changed to ${result.status}`);
      lastStatus = result.status;
    }

    if (result.status === TaskStatus.Failed) {
      throw new Error(`Subtask with ID ${subtaskId} has failed. Error: ${result.error}.`);
    }

    if (![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(result.status)) {
      logger.debug(
        `Subtask ${subtaskId} finished with status ${result.status} after ${pollCount} polls (${
          Date.now() - startedAt
        }ms)`
      );
      return result;
    }

    await sleep(SUBTASK_POLL_INTERVAL_MS);
  }
}

async function scheduleFeaturesIdentificationTask(
  params: FeaturesIdentificationTaskParams,
  taskClient: TaskClient<StreamsTaskType>,
  request: KibanaRequest
): Promise<string> {
  const id = getFeaturesIdentificationTaskId(params.streamName);

  await taskClient.schedule<FeaturesIdentificationTaskParams>({
    task: {
      type: FEATURES_IDENTIFICATION_TASK_TYPE,
      id,
      space: '*',
    },
    params,
    request,
  });

  return id;
}

async function scheduleQueriesGenerationTask(
  params: SignificantEventsQueriesGenerationTaskParams,
  taskClient: TaskClient<StreamsTaskType>,
  request: KibanaRequest
): Promise<string> {
  const id = getSignificantEventsQueriesGenerationTaskId(params.streamName);

  await taskClient.schedule<SignificantEventsQueriesGenerationTaskParams>({
    task: {
      type: SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
      id,
      space: '*',
    },
    params,
    request,
  });

  return id;
}
