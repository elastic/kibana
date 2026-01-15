/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { TaskPriority, type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import { TaskStatus } from '@kbn/streams-schema';
import type { TaskStorageClient } from './storage';
import type { PersistedTask, TaskParams } from './types';
import { CancellationInProgressError } from './cancellation_in_progress_error';
import { AcknowledgingIncompleteError } from './acknowledging_incomplete_error';

interface TaskRequest<TaskType, TParams extends {}> {
  task: Omit<PersistedTask & { type: TaskType }, 'status' | 'created_at' | 'task'>;
  params: TParams;
  request: KibanaRequest;
}

export class TaskClient<TaskType extends string> {
  constructor(
    private readonly taskManagerStart: TaskManagerStartContract,
    private readonly storageClient: TaskStorageClient,
    private readonly logger: Logger
  ) {}

  public async get<TParams extends {} = {}, TPayload extends {} = {}>(
    id: string
  ): Promise<PersistedTask<TParams, TPayload>> {
    try {
      this.logger.debug(`Getting task ${id}`);

      const response = await this.storageClient.get({
        id,
      });

      if (!response._source) {
        // Should not happen
        throw new Error(`Task ${id} has no source`);
      }

      return response._source as PersistedTask<TParams, TPayload>;
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          id,
          status: TaskStatus.NotStarted,
          created_at: '',
          space: '',
          stream: '',
          type: '',
          task: {
            params: {} as TParams,
          },
        };
      }

      throw error;
    }
  }

  public async schedule<TParams extends {} = {}>({
    task,
    params,
    request,
  }: TaskRequest<TaskType, TParams>) {
    const storedTask = await this.get(task.id);
    if (storedTask.status === TaskStatus.BeingCanceled) {
      throw new CancellationInProgressError('Previous task run is still being canceled');
    }

    const taskDoc: PersistedTask<TParams> = {
      ...task,
      task: {
        params,
      },
      status: TaskStatus.InProgress,
      created_at: new Date().toISOString(),
    };

    try {
      await this.taskManagerStart.schedule(
        {
          id: task.id,
          taskType: task.type,
          params: {
            ...params,
            _task: {
              ...taskDoc,
            },
          } satisfies TaskParams<TParams>,
          state: {},
          scope: ['streams'],
          priority: TaskPriority.Normal,
        },
        {
          request,
        }
      );

      this.logger.debug(`Scheduled ${task.type} task (${task.id})`);
      await this.update(taskDoc);
    } catch (error) {
      const isVersionConflict =
        isResponseError(error) && error.message.includes('version conflict');
      if (!isVersionConflict) {
        throw error;
      }
    }
  }

  public async cancel(id: string) {
    this.logger.debug(`Canceling task ${id}`);

    const task = await this.get(id);
    if (task.status !== TaskStatus.InProgress) {
      return;
    }

    await this.update({
      ...task,
      status: TaskStatus.BeingCanceled,
    });
  }

  public async acknowledge<TParams extends {} = {}, TPayload extends {} = {}>(id: string) {
    const task = await this.get<TParams, TPayload>(id);

    if (task.status !== TaskStatus.Completed) {
      throw new AcknowledgingIncompleteError('Only completed tasks can be acknowledged');
    }

    this.logger.debug(`Acknowledging task ${id}`);

    const taskDoc = {
      ...task,
      status: TaskStatus.Acknowledged,
    } satisfies PersistedTask<TParams, TPayload>;

    await this.update(taskDoc);

    return taskDoc;
  }

  public async update<TParams extends {} = {}, TPayload extends {} = {}>(
    task: PersistedTask<TParams, TPayload>
  ) {
    this.logger.debug(`Updating task ${task.id}`);

    await this.storageClient.index({
      id: task.id,
      document: task,
      // This might cause issues if there are many updates in a short time from multiple tasks running concurrently
      refresh: true,
    });
  }
}
