/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import type { TaskClient } from '../../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../../lib/tasks/task_definitions';
import { getOnboardingTaskId } from '../../../lib/tasks/task_definitions/onboarding';

interface CancelKiIdentificationHandlerParams {
  stream_name: string;
  task_client: TaskClient<StreamsTaskType>;
}

interface CancelKiIdentificationHandlerResult {
  stream_name: string;
  task_id: string;
  status: TaskStatus.BeingCanceled;
}

export async function cancelKiIdentificationToolHandler({
  stream_name: streamName,
  task_client: taskClient,
}: CancelKiIdentificationHandlerParams): Promise<CancelKiIdentificationHandlerResult> {
  const taskId = getOnboardingTaskId(streamName);

  await taskClient.cancel(taskId);

  return {
    stream_name: streamName,
    task_id: taskId,
    status: TaskStatus.BeingCanceled,
  };
}
