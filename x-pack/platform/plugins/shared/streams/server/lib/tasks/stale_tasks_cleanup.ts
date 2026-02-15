/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { TaskClient } from './task_client';
import { taskStorageSettings, type TaskStorageSettings } from './storage';
import type { PersistedTask } from './types';

export const STALE_TASKS_CLEANUP_TASK_TYPE = 'streams:stale-tasks-cleanup';
export const STALE_TASKS_CLEANUP_TASK_VERSION = '1.0.0';
const STALE_TASKS_CLEANUP_TASK_TITLE = 'Streams Stale Tasks Cleanup';
const STALE_TASKS_CLEANUP_SCOPE = ['streams'];
const STALE_TASKS_CLEANUP_INTERVAL = '24h';
const STALE_TASKS_CLEANUP_TIMEOUT = '5m';

/** Tasks with no activity in this many days are considered stale */
export const STALE_THRESHOLD_DAYS = 7;

interface StaleTasksCleanupSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}

interface StaleTasksCleanupStartContract {
  taskManager: TaskManagerStartContract;
}

export class StaleTasksCleanupTask {
  private core: CoreSetup;
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor({ core, taskManager, logger }: StaleTasksCleanupSetupContract) {
    this.core = core;
    this.logger = logger.get('stale-tasks-cleanup');

    taskManager.registerTaskDefinitions({
      [STALE_TASKS_CLEANUP_TASK_TYPE]: {
        title: STALE_TASKS_CLEANUP_TASK_TITLE,
        timeout: STALE_TASKS_CLEANUP_TIMEOUT,
        createTaskRunner: ({ taskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance.id);
            },
            cancel: async () => {
              this.logger.debug('Stale tasks cleanup task was cancelled');
            },
          };
        },
      },
    });
  }

  public get taskId(): string {
    return `${STALE_TASKS_CLEANUP_TASK_TYPE}:${STALE_TASKS_CLEANUP_TASK_VERSION}`;
  }

  public async start({ taskManager }: StaleTasksCleanupStartContract): Promise<void> {
    if (!taskManager) {
      this.logger.error('Missing required taskManager service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(`Started with interval of [${STALE_TASKS_CLEANUP_INTERVAL}]`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: STALE_TASKS_CLEANUP_TASK_TYPE,
        scope: STALE_TASKS_CLEANUP_SCOPE,
        schedule: {
          interval: STALE_TASKS_CLEANUP_INTERVAL,
        },
        state: {},
        params: { version: STALE_TASKS_CLEANUP_TASK_VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling stale tasks cleanup task: ${e.message}`);
    }
  }

  private async runTask(taskInstanceId: string): Promise<void> {
    if (!this.wasStarted) {
      this.logger.debug('runTask aborted: task not started yet');
      return;
    }

    // Check that this task is current version
    if (taskInstanceId !== this.taskId) {
      this.logger.debug(
        `Outdated task version: Got [${taskInstanceId}] from task instance. Current version is [${this.taskId}]`
      );
      return;
    }

    this.logger.debug('Starting stale tasks cleanup');

    try {
      const deletedCount = await this.cleanupStaleTasks();
      this.logger.info(`Stale tasks cleanup completed: deleted ${deletedCount} stale tasks`);
    } catch (error) {
      this.logger.error(`Stale tasks cleanup failed: ${error.message}`);
    }
  }

  /**
   * Cleans up stale tasks from the Streams task index.
   * A task is considered stale if it has no activity in the last STALE_THRESHOLD_DAYS days.
   * Activity is the maximum of: created_at, last_completed_at, last_acknowledged_at,
   * last_canceled_at, last_failed_at.
   *
   * @returns The number of tasks deleted
   */
  public async cleanupStaleTasks(): Promise<number> {
    const [coreStart, pluginsStart] = await this.core.getStartServices();
    const taskManager = (pluginsStart as { taskManager: TaskManagerStartContract }).taskManager;

    const storageAdapter = new StorageIndexAdapter<TaskStorageSettings, PersistedTask>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('storage'),
      taskStorageSettings
    );

    const taskClient = new TaskClient(
      taskManager,
      storageAdapter.getClient(),
      this.logger.get('task_client')
    );

    const tasks = await taskClient.listWithActivity();
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const staleTasks = tasks.filter((task) => {
      // Don't delete the cleanup task itself
      if (task.id === this.taskId) {
        return false;
      }

      const lastActivity = TaskClient.getLastActivity(task);
      return lastActivity < staleThreshold;
    });

    this.logger.debug(
      `Found ${staleTasks.length} stale tasks out of ${
        tasks.length
      } total tasks (threshold: ${staleThreshold.toISOString()})`
    );

    let deletedCount = 0;
    for (const task of staleTasks) {
      try {
        await taskClient.deleteTask(task.id);
        deletedCount++;
        this.logger.debug(`Deleted stale task: ${task.id}`);
      } catch (error) {
        this.logger.warn(`Failed to delete stale task ${task.id}: ${error.message}`);
      }
    }

    return deletedCount;
  }
}
