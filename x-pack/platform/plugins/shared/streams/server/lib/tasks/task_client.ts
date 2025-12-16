/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { TaskPriority, type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import type { TaskStorageClient } from './storage';
import type { PersistedTask, TaskParams } from './types';

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

  public async get<TPayload extends {} = {}>(id: string): Promise<PersistedTask<TPayload>> {
    try {
      this.logger.debug(`Getting task ${id}`);

      const response = await this.storageClient.get({
        id,
      });

      if (!response._source) {
        // Should not happen
        throw new Error(`Task ${id} has no source`);
      }

      return response._source as PersistedTask<TPayload>;
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          id,
          status: 'not_started',
          created_at: '',
          space: '',
          stream: '',
          type: '',
        };
      }

      throw error;
    }
  }

  public async schedule<TParams extends {} = {}>({
    task,
    params,
    request,
  }: TaskRequest<TaskType, TParams>): Promise<PersistedTask> {
    const taskDoc: PersistedTask = {
      ...task,
      status: 'in_progress',
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

    return taskDoc;
  }

  public async update<TPayload extends {} = {}>(
    task: PersistedTask<TPayload>
  ): Promise<PersistedTask<TPayload>> {
    this.logger.debug(`Updating task ${task.id}`);

    await this.storageClient.index({
      id: task.id,
      document: task,
      // This might cause issues if there are many updates in a short time from multiple tasks running concurrently
      refresh: true,
    });

    return task;
  }
}
