/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import type {
  GeneratedSignificantEventQuery,
  SignificantEventsQueriesGenerationResult,
} from '@kbn/streams-schema';
import { convertGetResponseIntoUpsertRequest, TaskStatus } from '@kbn/streams-schema';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { v4 } from 'uuid';
import type { IdentifyFeaturesResult } from '@kbn/streams-schema/src/api/features';
import {
  type InsightsOnboardingResult,
  InsightsOnboardingStep,
} from '@kbn/streams-schema/src/insights';
import type { GenerateDescriptionResult } from '@kbn/streams-schema/src/api/description_generation';
import type { TaskResult } from '@kbn/streams-schema/src/tasks/types';
import type { StreamsTaskType, TaskContext } from '.';
import { readStream } from '../../../routes/streams/crud/read_stream';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { AttachmentClient } from '../../streams/attachments/attachment_client';
import type { StreamsClient } from '../../streams/client';
import { cancellableTask } from '../cancellable_task';
import type { TaskClient } from '../task_client';
import type { TaskParams } from '../types';
import {
  type DescriptionGenerationTaskParams,
  DESCRIPTION_GENERATION_TASK_TYPE,
  getDescriptionGenerationTaskId,
} from './description_generation';
import type { FeaturesIdentificationTaskParams } from './features_identification';
import {
  FEATURES_IDENTIFICATION_TASK_TYPE,
  getFeaturesIdentificationTaskId,
} from './features_identification';
import type { SignificantEventsQueriesGenerationTaskParams } from './significant_events_queries_generation';
import {
  getSignificantEventsQueriesGenerationTaskId,
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
} from './significant_events_queries_generation';

export interface InsightsOnboardingTaskParams {
  connectorId: string;
  streamName: string;
  from: number;
  to: number;
  steps: InsightsOnboardingStep[];
}

export const STREAMS_INSIGHTS_ONBOARDING_TASK_TYPE = 'streams_insights_onboarding';

export function getInsightsOnboardingTaskId(streamName: string) {
  return `${STREAMS_INSIGHTS_ONBOARDING_TASK_TYPE}_${streamName}`;
}

export function createStreamsInsightsOnboardingTask(taskContext: TaskContext) {
  return {
    [STREAMS_INSIGHTS_ONBOARDING_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, streamName, from, to, steps, _task } = runContext.taskInstance
                .params as TaskParams<InsightsOnboardingTaskParams>;

              const {
                taskClient,
                streamsClient,
                inferenceClient,
                attachmentClient,
                queryClient,
                scopedClusterClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              try {
                let descriptionTaskResult: TaskResult<GenerateDescriptionResult> | undefined;
                let featuresTaskResult: TaskResult<IdentifyFeaturesResult> | undefined;
                let queriesTaskResult:
                  | TaskResult<SignificantEventsQueriesGenerationResult>
                  | undefined;

                for (const step of steps) {
                  switch (step) {
                    case InsightsOnboardingStep.DescriptionGeneration:
                      const descriptionTaskId = await scheduleDescriptionGenerationTask(
                        {
                          connectorId,
                          start: from,
                          end: to,
                          streamName,
                        },
                        taskClient,
                        runContext.fakeRequest
                      );

                      descriptionTaskResult = await waitForSubtask<
                        DescriptionGenerationTaskParams,
                        GenerateDescriptionResult
                      >(descriptionTaskId, runContext.taskInstance.id, taskClient);

                      if (descriptionTaskResult.status !== TaskStatus.Completed) {
                        return;
                      }

                      await saveDescription(descriptionTaskResult.description, streamName, {
                        streamsClient,
                        queryClient,
                        attachmentClient,
                        scopedClusterClient,
                      });
                      break;

                    case InsightsOnboardingStep.FeaturesIdentification:
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

                    case InsightsOnboardingStep.QueriesGeneration:
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

                      await saveQueries(streamName, queriesTaskResult.queries, { queryClient });
                      break;

                    default:
                      throw new Error(`No implementation for "${step}" insights onboarding step.`);
                  }
                }

                await taskClient.complete<InsightsOnboardingTaskParams, InsightsOnboardingResult>(
                  _task,
                  { connectorId, streamName, from, to, steps },
                  { descriptionTaskResult, featuresTaskResult, queriesTaskResult }
                );
              } catch (error) {
                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : error.message;

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return;
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`,
                  { error }
                );

                await taskClient.fail<InsightsOnboardingTaskParams>(
                  _task,
                  {
                    connectorId,
                    streamName,
                    from,
                    to,
                    steps,
                  },
                  errorMessage
                );
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

async function waitForSubtask<TParams extends {} = {}, TPayload extends {} = {}>(
  subtaskId: string,
  parentTaskId: string,
  taskClient: TaskClient<StreamsTaskType>
): Promise<TaskResult<TPayload>> {
  const sleepInterval = 2000;
  let intervalId: NodeJS.Timeout;

  return await new Promise<TaskResult<TPayload>>((resolve, reject) => {
    intervalId = setInterval(async () => {
      const parentTask = await taskClient.get(parentTaskId);

      if (parentTask.status === TaskStatus.BeingCanceled) {
        await taskClient.cancel(subtaskId);
      }

      const result = await taskClient.getStatus<TParams, TPayload>(subtaskId);

      if (result.status === TaskStatus.Failed) {
        reject(`Subtask with ID ${subtaskId} has failed`);
      }

      if (![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(result.status)) {
        resolve(result);
      }
    }, sleepInterval);
  }).finally(() => {
    clearInterval(intervalId);
  });
}

async function scheduleDescriptionGenerationTask(
  params: DescriptionGenerationTaskParams,
  taskClient: TaskClient<StreamsTaskType>,
  request: KibanaRequest
): Promise<string> {
  const id = getDescriptionGenerationTaskId(params.streamName);

  await taskClient.schedule<DescriptionGenerationTaskParams>({
    task: {
      type: DESCRIPTION_GENERATION_TASK_TYPE,
      id,
      space: '*',
    },
    params,
    request,
  });

  return id;
}

async function saveDescription(
  description: string,
  streamName: string,
  deps: {
    streamsClient: StreamsClient;
    queryClient: QueryClient;
    attachmentClient: AttachmentClient;
    scopedClusterClient: IScopedClusterClient;
  }
) {
  const { queryClient, attachmentClient, streamsClient, scopedClusterClient } = deps;
  const streamResponse = await readStream({
    name: streamName,
    queryClient,
    attachmentClient,
    streamsClient,
    scopedClusterClient,
  });
  const upsertRequest = convertGetResponseIntoUpsertRequest(streamResponse);

  upsertRequest.stream.description = description;

  await streamsClient.upsertStream({
    request: upsertRequest,
    name: streamName,
  });
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

export async function saveQueries(
  streamName: string,
  queries: GeneratedSignificantEventQuery[],
  deps: {
    queryClient: QueryClient;
  }
) {
  const { queryClient } = deps;

  if (queries.length === 0) {
    return;
  }

  await queryClient.bulk(
    streamName,
    queries.map((query) => ({
      index: {
        id: v4(),
        kql: { query: query.kql },
        title: query.title,
        feature: query.feature,
        severity_score: query.severity_score,
        evidence: query.evidence,
      },
    }))
  );
}
