/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server';

/**
 * Consumers register Task Manager task instance IDs. On maintenance window
 * mutations, this registry only calls `taskManager.runSoon` — no arbitrary
 * callbacks, so work stays inside the consumer's own task runner.
 * Already-running tasks are skipped; consumers schedule their own follow-up.
 */
export class MaintenanceWindowSyncTasks {
  // Counts registrations per task ID so two registrations of the same ID
  // aren't both cleared by the first call to unregister.
  private readonly taskIdCounts = new Map<string, number>();
  private taskManager?: TaskManagerStartContract;

  constructor(private readonly logger: Logger) {}

  public setTaskManager(taskManager: TaskManagerStartContract): void {
    this.taskManager = taskManager;
  }

  public register = (taskId: string): (() => void) => {
    this.taskIdCounts.set(taskId, (this.taskIdCounts.get(taskId) ?? 0) + 1);

    let unregistered = false;
    return () => {
      if (unregistered) {
        return;
      }
      unregistered = true;

      const count = this.taskIdCounts.get(taskId) ?? 0;
      if (count <= 1) {
        this.taskIdCounts.delete(taskId);
      } else {
        this.taskIdCounts.set(taskId, count - 1);
      }
    };
  };

  public runSoon = (): void => {
    const taskManager = this.taskManager;
    if (!taskManager || this.taskIdCounts.size === 0) {
      return;
    }

    for (const taskId of this.taskIdCounts.keys()) {
      void this.schedule(taskManager, taskId);
    }
  };

  private schedule = async (
    taskManager: TaskManagerStartContract,
    taskId: string
  ): Promise<void> => {
    try {
      await taskManager.runSoon(taskId);
    } catch (error) {
      if (error instanceof TaskAlreadyRunningError) {
        this.logger.debug(`Sync task "${taskId}" is already running; skipping runSoon.`);
        return;
      }
      this.logger.error(
        `Failed to schedule registered sync task "${taskId}" after maintenance window change: ${
          (error as Error).message
        }`,
        { error }
      );
    }
  };
}
