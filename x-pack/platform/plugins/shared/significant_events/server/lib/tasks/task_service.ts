/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { TaskClient } from './task_client';
import type { TaskStorageSettings } from './storage';
import { taskStorageSettings } from './storage';
import type { PersistedTask } from './types';
import type { TaskContext } from './task_definitions';
import { createTaskDefinitions, type StreamsTaskType } from './task_definitions';

export class TaskService {
  constructor(private readonly taskManagerSetup: TaskManagerSetupContract) {}

  public registerTasks(taskContext: TaskContext) {
    this.taskManagerSetup.registerTaskDefinitions(createTaskDefinitions(taskContext));
  }

  public async getClient(
    coreStart: CoreStart,
    taskManagerStart: TaskManagerStartContract,
    logger: Logger
  ) {
    const storageAdapter = new StorageIndexAdapter<TaskStorageSettings, PersistedTask>(
      coreStart.elasticsearch.client.asInternalUser,
      logger.get('task_client', 'storage'),
      taskStorageSettings
    );

    return new TaskClient<StreamsTaskType>(
      taskManagerStart,
      storageAdapter.getClient(),
      logger.get('task_client')
    );
  }
}
