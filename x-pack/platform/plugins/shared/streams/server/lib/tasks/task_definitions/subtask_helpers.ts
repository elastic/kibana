/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { TaskStatus } from '@kbn/streams-schema';
import type { TaskResult } from '@kbn/streams-schema';
import type { StreamsTaskType } from '.';
import type { TaskClient } from '../task_client';
import type { FeaturesIdentificationTaskParams } from './features_identification';
import {
  FEATURES_IDENTIFICATION_TASK_TYPE,
  getFeaturesIdentificationTaskId,
} from './features_identification';

export async function waitForSubtask<TParams extends {} = {}, TPayload extends {} = {}>(
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
        reject(new Error(`Subtask with ID ${subtaskId} has failed. Error: ${result.error}.`));
      }

      if (![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(result.status)) {
        resolve(result);
      }
    }, sleepInterval);
  }).finally(() => {
    clearInterval(intervalId);
  });
}

export async function scheduleFeaturesIdentificationTask(
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
