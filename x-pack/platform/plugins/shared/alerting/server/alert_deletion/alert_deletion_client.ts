/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';

export const ALERT_DELETION_TASK_TYPE = 'alert-deletion';

interface ConstructorOpts {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  logger: Logger;
  taskManagerSetup: TaskManagerSetupContract;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
}

export class AlertDeletionClient {
  private logger: Logger;
  private elasticsearchClientPromise: Promise<ElasticsearchClient>;
  private readonly taskManagerStartPromise: Promise<TaskManagerStartContract>;

  constructor(opts: ConstructorOpts) {
    this.elasticsearchClientPromise = opts.elasticsearchClientPromise;
    this.logger = opts.logger;
    this.taskManagerStartPromise = opts.taskManagerStartPromise;

    // Registers the task that handles alert deletion
    opts.taskManagerSetup.registerTaskDefinitions({
      [ALERT_DELETION_TASK_TYPE]: {
        title: 'Alert deletion task',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const abortController = new AbortController();
          return {
            run: async () => {
              return this.runTask(taskInstance, abortController);
            },

            cancel: async () => {
              abortController.abort('task timed out');
            },
          };
        },
      },
    });
  }

  public async scheduleTask(spaceIds: string[]) {
    try {
      const taskManager = await this.taskManagerStartPromise;
      await taskManager.ensureScheduled({
        id: `Alerting-${ALERT_DELETION_TASK_TYPE}`,
        taskType: ALERT_DELETION_TASK_TYPE,
        scope: ['alerting'],
        state: {},
        params: { spaceIds },
      });
    } catch (err) {
      this.logger.error(`Error scheduling alert deletion task: ${err.message}`);
    }
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    abortController: AbortController
  ) => {
    try {
      const esClient = await this.elasticsearchClientPromise;
      const spaceIds = taskInstance.params.spaceIds;

      // Query for rules settings in the specified space

      // For each rules settings, call the library function to delete alerts
    } catch (err) {}
  };
}
