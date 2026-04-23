/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnboardingResult } from '@kbn/streams-schema';
import type { TaskClient } from '../../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../../lib/tasks/task_definitions';
import {
  getOnboardingTaskId,
  type OnboardingTaskParams,
} from '../../../lib/tasks/task_definitions/onboarding';

interface GetKiIdentificationStatusHandlerParams {
  streamName: string;
  taskClient: TaskClient<StreamsTaskType>;
}

export async function getKiIdentificationStatusToolHandler({
  streamName,
  taskClient,
}: GetKiIdentificationStatusHandlerParams) {
  const taskId = getOnboardingTaskId(streamName);
  const status = await taskClient.getStatus<OnboardingTaskParams, OnboardingResult>(taskId);

  return {
    stream_name: streamName,
    task_id: taskId,
    ...status,
  };
}
