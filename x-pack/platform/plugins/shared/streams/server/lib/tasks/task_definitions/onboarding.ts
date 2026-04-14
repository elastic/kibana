/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  BaseFeature,
  GeneratedSignificantEventQuery,
  IdentifyFeaturesResult,
  OnboardingResult,
  SignificantEventsQueriesGenerationResult,
  TaskResult,
} from '@kbn/streams-schema';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { OnboardingStep, TaskStatus } from '@kbn/streams-schema';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { v4 } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LogMeta } from '@kbn/logging';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import {
  ExecutionStatus,
  isTerminalStatus,
  type WorkflowExecutionListItemDto,
} from '@kbn/workflows';
import type { StreamsTaskType, TaskContext } from '.';
import { getErrorMessage, parseError } from '../../streams/errors/parse_error';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { StreamsClient } from '../../streams/client';
import { cancellableTask } from '../cancellable_task';
import type { TaskClient } from '../task_client';
import type { TaskParams } from '../types';
import type { MemoryGenerationTaskParams } from './memory_generation';
import { MEMORY_GENERATION_TASK_TYPE } from './memory_generation';
import type { SignificantEventsQueriesGenerationTaskParams } from '../../sig_events/tasks/significant_events_queries_generation';
import {
  getSignificantEventsQueriesGenerationTaskId,
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
} from '../../sig_events/tasks/significant_events_queries_generation';
import type { WorkflowClient, WorkflowExecutionResult } from '../../workflows/workflow_client';
import type { FeaturesIdentificationWorkflowInputs } from '../../../../common/constants';

export interface OnboardingTaskParams {
  streamName: string;
  from: number;
  to: number;
  steps: OnboardingStep[];
  saveQueries: boolean;
  connectors?: {
    features?: string;
    queries?: string;
  };
}

export const STREAMS_ONBOARDING_TASK_TYPE = 'streams_onboarding';

export function getOnboardingTaskId(streamName: string, saveQueries: boolean = true) {
  const base = `${STREAMS_ONBOARDING_TASK_TYPE}_${streamName}`;
  return saveQueries ? base : `${base}_no_save_queries`;
}

const FEATURES_IDENTIFICATION_RECENCY_MS = 12 * 60 * 60 * 1000; // 12 hours

const streamNamePredicate = (name: string) => {
  return (exec: WorkflowExecutionListItemDto) => exec.context?.streamName === name;
};

function toIdentifyFeaturesResult(
  execution: WorkflowExecutionResult
): TaskResult<IdentifyFeaturesResult> {
  const output = execution.output ?? {};
  const rawFeatures = output.discoveredFeatures;
  const features = Array.isArray(rawFeatures) ? (rawFeatures as BaseFeature[]) : [];
  const tokensUsed = output.tokensUsed as ChatCompletionTokenCount | undefined;

  return {
    status: TaskStatus.Completed,
    features,
    durationMs: execution.duration ?? 0,
    totalTokensUsed: tokensUsed,
  };
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

              const { streamName, from, to, steps, saveQueries, connectors, _task } = runContext
                .taskInstance.params as TaskParams<OnboardingTaskParams>;

              const { taskClient, getQueryClient, streamsClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: fakeRequest,
                });

              const { featuresIdentificationWorkflowClient: workflowClient } = taskContext;

              try {
                let featuresTaskResult: TaskResult<IdentifyFeaturesResult> | undefined;
                let queriesTaskResult:
                  | TaskResult<SignificantEventsQueriesGenerationResult>
                  | undefined;

                for (const step of steps) {
                  switch (step) {
                    case OnboardingStep.FeaturesIdentification: {
                      if (!workflowClient) {
                        throw new Error(
                          'KI features identification workflow client is not available'
                        );
                      }

                      const isFeaturesOnlyStep =
                        steps.length === 1 && steps[0] === OnboardingStep.FeaturesIdentification;

                      if (!isFeaturesOnlyStep) {
                        const lastExec = await workflowClient.getLastCompletedExecution(
                          streamNamePredicate(streamName),
                          { maxAgeMs: FEATURES_IDENTIFICATION_RECENCY_MS }
                        );

                        if (lastExec) {
                          const status = await workflowClient.getStatus(lastExec.id);
                          featuresTaskResult = toIdentifyFeaturesResult(status);
                        }
                      }

                      if (!featuresTaskResult) {
                        const { executionId } = await workflowClient.run(
                          {
                            streamName,
                            start: from,
                            end: to,
                            connectorId: connectors?.features,
                          },
                          fakeRequest
                        );

                        featuresTaskResult = await waitForWorkflowExecution(
                          executionId,
                          runContext.taskInstance.id,
                          { workflowClient, taskClient }
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
                      >(queriesTaskId, runContext.taskInstance.id, taskClient);

                      if (queriesTaskResult.status !== TaskStatus.Completed) {
                        return;
                      }

                      if (saveQueries) {
                        await persistQueries(streamName, queriesTaskResult.queries, {
                          queryClient: await getQueryClient(),
                          streamsClient,
                        });
                      }
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
                    saveQueries,
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
                // Errors here originate from waitForSubtask / waitForWorkflowExecution (plain Error),
                // not from inference calls. isInferenceProviderError is always false, so no connector
                // enrichment is needed.
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
                    saveQueries,
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
  taskClient: TaskClient<StreamsTaskType>
): Promise<TaskResult<TPayload>> {
  while (true) {
    const parentTask = await taskClient.get(parentTaskId);

    if (parentTask.status === TaskStatus.BeingCanceled) {
      await taskClient.cancel(subtaskId);
    }

    const result = await taskClient.getStatus<TParams, TPayload>(subtaskId);

    if (result.status === TaskStatus.Failed) {
      throw new Error(`Subtask with ID ${subtaskId} has failed. Error: ${result.error}.`);
    }

    if (![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(result.status)) {
      return result;
    }

    await sleep(SUBTASK_POLL_INTERVAL_MS);
  }
}

async function waitForWorkflowExecution(
  executionId: string,
  parentTaskId: string,
  deps: {
    workflowClient: WorkflowClient<FeaturesIdentificationWorkflowInputs>;
    taskClient: TaskClient<StreamsTaskType>;
  }
): Promise<TaskResult<IdentifyFeaturesResult>> {
  const { workflowClient, taskClient } = deps;

  while (true) {
    const parentTask = await taskClient.get(parentTaskId);

    if (parentTask.status === TaskStatus.BeingCanceled) {
      await workflowClient.cancel(executionId);
    }

    const execution = await workflowClient.getStatus(executionId);

    if (isTerminalStatus(execution.status)) {
      if (execution.status === ExecutionStatus.COMPLETED) {
        return toIdentifyFeaturesResult(execution);
      }

      const errorMsg = execution.error ?? `Workflow execution ${executionId} ${execution.status}`;
      throw new Error(errorMsg);
    }

    await sleep(SUBTASK_POLL_INTERVAL_MS);
  }
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

export async function persistQueries(
  streamName: string,
  queries: GeneratedSignificantEventQuery[],
  deps: {
    queryClient: QueryClient;
    streamsClient: StreamsClient;
  }
) {
  const { queryClient, streamsClient } = deps;

  if (queries.length === 0) {
    return;
  }

  const definition = await streamsClient.getStream(streamName);

  await queryClient.bulk(
    definition,
    queries.map((query) => ({
      index: {
        id: v4(),
        type: query.type,
        esql: query.esql,
        title: query.title,
        description: query.description,
        severity_score: query.severity_score,
        evidence: query.evidence,
      },
    })),
    { createRules: false }
  );
}
