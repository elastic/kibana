/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import {
  OnboardingStep,
  TaskStatus,
  type GeneratedSignificantEventQuery,
  type IdentifyFeaturesResult,
  type OnboardingResult,
  type SignificantEventsQueriesGenerationResult,
  type TaskResult,
} from '@kbn/streams-schema';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { v4 } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LogMeta } from '@kbn/logging';
import type { StreamsTaskType, TaskContext } from '.';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { StreamsClient } from '../../streams/client';
import { cancellableTask } from '../cancellable_task';
import type { TaskClient } from '../task_client';
import type { TaskParams } from '../types';
import type { FeaturesIdentificationTaskParams } from './features_identification';
import type { SignificantEventsQueriesGenerationTaskParams } from './significant_events_queries_generation';
import {
  getSignificantEventsQueriesGenerationTaskId,
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
} from './significant_events_queries_generation';
import { waitForSubtask, scheduleFeaturesIdentificationTask } from './subtask_helpers';

export interface OnboardingTaskParams {
  connectorId: string;
  streamName: string;
  from: number;
  to: number;
  steps: OnboardingStep[];
  saveQueries: boolean;
}

export const STREAMS_ONBOARDING_TASK_TYPE = 'streams_onboarding';

export function getOnboardingTaskId(streamName: string, saveQueries: boolean = true) {
  const base = `${STREAMS_ONBOARDING_TASK_TYPE}_${streamName}`;
  return saveQueries ? base : `${base}_no_save_queries`;
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

              const { connectorId, streamName, from, to, steps, saveQueries, _task } = runContext
                .taskInstance.params as TaskParams<OnboardingTaskParams>;

              const { taskClient, inferenceClient, queryClient, streamsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              try {
                let featuresTaskResult: TaskResult<IdentifyFeaturesResult> | undefined;
                let queriesTaskResult:
                  | TaskResult<SignificantEventsQueriesGenerationResult>
                  | undefined;

                for (const step of steps) {
                  switch (step) {
                    case OnboardingStep.FeaturesIdentification:
                      const featuresTaskId = await scheduleFeaturesIdentificationTask(
                        {
                          connectorId,
                          start: from,
                          end: to,
                          streamName,
                        },
                        taskClient,
                        runContext.fakeRequest
                      );

                      featuresTaskResult = await waitForSubtask<
                        FeaturesIdentificationTaskParams,
                        IdentifyFeaturesResult
                      >(featuresTaskId, runContext.taskInstance.id, taskClient);

                      if (featuresTaskResult.status !== TaskStatus.Completed) {
                        return;
                      }
                      break;

                    case OnboardingStep.QueriesGeneration:
                      const queriesTaskId = await scheduleQueriesGenerationTask(
                        {
                          connectorId,
                          start: from,
                          end: to,
                          streamName,
                        },
                        taskClient,
                        runContext.fakeRequest
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
                          queryClient,
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
                  { connectorId, streamName, from, to, steps, saveQueries },
                  { featuresTaskResult, queriesTaskResult }
                );
              } catch (error) {
                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : getErrorMessage(error);

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
                    connectorId,
                    streamName,
                    from,
                    to,
                    steps,
                    saveQueries,
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
        kql: { query: query.kql },
        title: query.title,
        feature: query.feature,
        severity_score: query.severity_score,
        evidence: query.evidence,
      },
    })),
    { createRules: false }
  );
}
