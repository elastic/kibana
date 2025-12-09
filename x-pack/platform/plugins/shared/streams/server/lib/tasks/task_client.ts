/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { isNotFoundError } from '@kbn/es-errors';
import type { TaskStorageClient } from './storage';
import type { PersistedTask } from './types';

interface TaskRequest<TaskType> {
  id: string;
  type: TaskType;
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
        this.logger.warn(`Task ${id} has no source`);
        return {
          id,
          status: 'not_started',
        };
      }

      return response._source as PersistedTask<TPayload>;
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          id,
          status: 'not_started',
        };
      }

      throw error;
    }
  }

  public async schedule<TPayload extends {} = {}>({
    id,
    type,
    request,
  }: TaskRequest<TaskType>): Promise<PersistedTask<TPayload>> {
    this.logger.debug(`Scheduling ${type} task (${id})`);

    await this.taskManagerStart.schedule(
      {
        id,
        taskType: type,
        params: {},
        state: {},
        scope: ['streams'],
        priority: 1,
      },
      {
        request,
      }
    );

    return await this.update({
      id,
      status: 'in_progress',
    });
  }

  public async update<TPayload extends {} = {}>(
    task: PersistedTask<TPayload>
  ): Promise<PersistedTask<TPayload>> {
    this.logger.debug(`Updating task ${task.id}`);

    await this.storageClient.index({
      id: task.id,
      document: task,
      refresh: true, // Is this a good idea? The risk is that two tasks are scheduled simultaneously
    });

    return task;
  }
}
