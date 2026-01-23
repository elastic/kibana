/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { TaskStatus } from '@kbn/streams-schema';
import { AcknowledgingIncompleteError } from '../../lib/tasks/acknowledging_incomplete_error';
import { CancellationInProgressError } from '../../lib/tasks/cancellation_in_progress_error';
import type { TaskClient } from '../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../lib/tasks/task_definitions';
import type { TaskResult } from '../../lib/tasks/types';

interface ScheduleTaskConfig<TParams extends object> {
  taskType: StreamsTaskType;
  taskId: string;
  streamName: string;
  params: TParams;
  request: KibanaRequest;
}

interface HandleTaskActionBaseParams {
  taskClient: TaskClient<StreamsTaskType>;
  taskId: string;
}

interface HandleScheduleActionParams<TParams extends object> extends HandleTaskActionBaseParams {
  action: 'schedule';
  scheduleConfig: ScheduleTaskConfig<TParams>;
}

interface HandleCancelOrAcknowledgeActionParams extends HandleTaskActionBaseParams {
  action: 'cancel' | 'acknowledge';
  scheduleConfig?: undefined;
}

type HandleTaskActionParams<TParams extends object> =
  | HandleScheduleActionParams<TParams>
  | HandleCancelOrAcknowledgeActionParams;

/**
 * Handles task lifecycle actions: schedule, cancel, and acknowledge.
 * Returns the appropriate response based on the action.
 */
export async function handleTaskAction<TParams extends object, TPayload extends object>(
  params: HandleTaskActionParams<TParams>
): Promise<TaskResult<TPayload>> {
  const { taskClient, taskId, action } = params;

  if (action === 'schedule') {
    const { scheduleConfig } = params;

    try {
      await taskClient.schedule<TParams>({
        task: {
          type: scheduleConfig.taskType,
          id: scheduleConfig.taskId,
          space: '*',
          stream: scheduleConfig.streamName,
        },
        params: scheduleConfig.params,
        request: scheduleConfig.request,
      });

      return {
        status: TaskStatus.InProgress,
      };
    } catch (error) {
      if (error instanceof CancellationInProgressError) {
        throw conflict(error.message);
      }
      throw error;
    }
  } else if (action === 'cancel') {
    await taskClient.cancel(taskId);

    return {
      status: TaskStatus.BeingCanceled,
    };
  }

  // action === 'acknowledge'
  try {
    const task = await taskClient.acknowledge<TParams, TPayload>(taskId);

    return {
      status: TaskStatus.Acknowledged,
      ...task.task.payload,
    };
  } catch (error) {
    if (error instanceof AcknowledgingIncompleteError) {
      throw conflict(error.message);
    }
    throw error;
  }
}
