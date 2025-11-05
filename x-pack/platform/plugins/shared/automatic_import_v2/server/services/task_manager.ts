/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';

const TASK_TYPE = 'automaticImport-aiWorkflow';

export class TaskManagerService {
  private logger: Logger;
  private taskManager: TaskManagerStartContract | null = null;

  constructor(logger: Logger, taskManagerSetup: TaskManagerSetupContract) {
    this.logger = logger.get('taskManagerService');

    // Register task definitions during setup phase
    taskManagerSetup.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Automatic Import AI Workflow',
        description: 'Executes long-running AI agent workflows for automatic import',
        timeout: '30m',
        maxAttempts: 3,
        maxConcurrency: 1,
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => this.runTask(taskInstance),
          cancel: async () => this.cancelTask(taskInstance),
        }),
      },
    });

    this.logger.info(`Task definition "${TASK_TYPE}" registered`);
  }

  // for lifecycle start phase
  public initialize(taskManager: TaskManagerStartContract): void {
    this.taskManager = taskManager;
    this.logger.debug('TaskManagerService initialized');
  }

  public async scheduleAIWorkflowTask(params: {
    integrationId: string;
    dataStreamId: string;
    [key: string]: any;
  }): Promise<{ taskId: string }> {
    if (!this.taskManager) {
      throw new Error('TaskManager not initialized');
    }

    // for each task, we want idempotent behavior so that we are not running more than one AI process per datastream.
    // therefore we use ensureScheduled with some id that ensures a pattern based on datastream and integration id
    const taskInstance = await this.taskManager.ensureScheduled({
      id: `automaticImport-aiWorkflow-${params.integrationId}-${params.dataStreamId}`,
      taskType: TASK_TYPE,
      params,
      state: { status: 'pending' },
      scope: ['automaticImport'],
    });

    this.logger.info(`Task scheduled: ${taskInstance.id}`);

    return { taskId: taskInstance.id };
  }

  // also return more info like state, params, runAt, startedAt, retryAt?
  // Rely mainly on task manager for polling the status.
  public async getTaskStatus(taskId: string): Promise<{
    status: string;
  }> {
    if (!this.taskManager) {
      throw new Error('TaskManager not initialized');
    }

    try {
      const task = await this.taskManager.get(taskId);

      return {
        status: task.status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get task status for ${taskId}:`, error);
      throw new Error(`Task ${taskId} not found or inaccessible`);
    }
  }

  private async runTask(taskInstance: ConcreteTaskInstance) {
    const { id: taskId, params } = taskInstance;

    this.logger.info(`Running task ${taskId}`, params);

    // Placeholder for actual AI workflow
    // This is where you'll implement your long-running task logic and update the task status as needed.
    try {
      await new Promise((resolve) => setTimeout(resolve, 20000)); // 20 seconds to simulate AI work

      this.logger.info(`Task ${taskId} completed successfully`);

      return { state: { status: 'completed' } };
    } catch (error: any) {
      this.logger.error(`Task ${taskId} failed:`, error);
      return { state: { status: 'failed' }, error };
    }
  }

  private async cancelTask(taskInstance: ConcreteTaskInstance) {
    // Cancel the AI task here
    this.logger.info(`Cancelling task ${taskInstance.id}`);
    return { state: { status: 'cancelled' } };
  }
}
