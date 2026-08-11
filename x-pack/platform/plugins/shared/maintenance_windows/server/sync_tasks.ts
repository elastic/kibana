/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

/**
 * Consumers register Task Manager task instance IDs. On maintenance window
 * mutations, this registry only calls `taskManager.runSoon` — no arbitrary
 * callbacks, so work stays inside the consumer's own task runner.
 */
export class MaintenanceWindowSyncTasks {
  private readonly taskIds = new Set<string>();
  private taskManager?: TaskManagerStartContract;

  constructor(private readonly logger: Logger) {}

  public setTaskManager(taskManager: TaskManagerStartContract): void {
    this.taskManager = taskManager;
  }

  public register = (taskId: string): (() => void) => {
    this.taskIds.add(taskId);
    return () => {
      this.taskIds.delete(taskId);
    };
  };

  public runSoon = (): void => {
    const taskManager = this.taskManager;
    if (!taskManager || this.taskIds.size === 0) {
      return;
    }

    for (const taskId of this.taskIds) {
      void taskManager.runSoon(taskId).catch((error) => {
        this.logger.error(
          `Failed to schedule registered sync task "${taskId}" after maintenance window change: ${
            (error as Error).message
          }`,
          { error }
        );
      });
    }
  };
}
