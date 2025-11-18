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
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server/task';
import { MAX_ATTEMPTS_AI_WORKFLOWS, TASK_TIMEOUT_DURATION } from './constants';
import { TASK_STATUSES } from './saved_objects/constants';

const TASK_TYPE = 'autoImport-task';

export class TaskManagerService {
  private logger: Logger;
  private taskManager: TaskManagerStartContract | null = null;
  private invokeDeepAgent?: (integrationId: string, dataStreamId: string) => Promise<any>;

  constructor(
    logger: Logger,
    taskManagerSetup: TaskManagerSetupContract,
    options?: {
      invokeDeepAgent?: (integrationId: string, dataStreamId: string) => Promise<any>;
    }
  ) {
    this.logger = logger.get('taskManagerService');
    this.invokeDeepAgent = options?.invokeDeepAgent;

    // Register task definitions during setup phase
    taskManagerSetup.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Automatic Import AI Workflow',
        description: 'Executes long-running AI agent workflows for automatic import',
        timeout: TASK_TIMEOUT_DURATION,
        maxAttempts: MAX_ATTEMPTS_AI_WORKFLOWS,
        cost: TaskCost.Normal,
        priority: TaskPriority.Normal,
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

    // Generate a task ID that is always under 50 characters
    // TODO: Should we increase the length of id to more characters?
    // Pattern: ai-task-{integrationId}-{dataStreamId}
    const taskId = `ai-task-${params.integrationId}-${params.dataStreamId}`;

    const taskInstance = await this.taskManager.ensureScheduled({
      id: taskId,
      taskType: TASK_TYPE,
      params,
      state: { task_status: TASK_STATUSES.pending },
      scope: ['automaticImport'],
    });

    this.logger.info(`Task scheduled: ${taskInstance.id}`);

    return { taskId: taskInstance.id };
  }

  public async getTaskStatus(taskId: string): Promise<{
    task_status: keyof typeof TASK_STATUSES;
  }> {
    if (!this.taskManager) {
      throw new Error('TaskManager not initialized');
    }

    try {
      const task = await this.taskManager.get(taskId);

      return {
        task_status: task.state?.task_status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get task status for ${taskId}:`, error);
      throw new Error(`Task ${taskId} not found or inaccessible`);
    }
  }

  private async runTask(taskInstance: ConcreteTaskInstance) {
    const { id: taskId, params } = taskInstance;

    this.logger.info(`Running task ${taskId}`, params);

    try {
      if (this.invokeDeepAgent) {
        // Instantiate the AgentService from API in the future and use in the the runTask function
        await this.invokeDeepAgent(params.integrationId, params.dataStreamId);
        this.logger.debug(`Task ${taskId}: Deep agent invocation completed`);
      } else {
        this.logger.warn(`Task ${taskId}: No invokeDeepAgent function provided, using mock delay`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      this.logger.info(`Task ${taskId} completed successfully`);

      return { state: { task_status: TASK_STATUSES.completed } };
    } catch (error: any) {
      this.logger.error(`Task ${taskId} failed:`, error);
      return { state: { task_status: TASK_STATUSES.failed }, error };
    }
  }

  private async cancelTask(taskInstance: ConcreteTaskInstance) {
    // Cancel the AI task here
    this.logger.info(`Cancelling task ${taskInstance.id}`);
    return { state: { task_status: TASK_STATUSES.cancelled } };
  }
}
