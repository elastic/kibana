/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { TaskHandler } from './task_handler';

export const taskTypes = {
  runAgent: 'agent-builder:run-agent',
} as const;

export interface RunAgentTaskParams {
  executionId: string;
}

/**
 * Register agent builder task definitions with task manager.
 * Must be called during plugin setup.
 */
export const registerTaskDefinitions = ({
  taskManager,
  getTaskHandler,
}: {
  taskManager: TaskManagerSetupContract;
  getTaskHandler: () => TaskHandler;
}) => {
  taskManager.registerTaskDefinitions({
    [taskTypes.runAgent]: {
      title: 'Agent Builder: Run agent execution',
      timeout: '20m',
      maxAttempts: 1,
      createTaskRunner: (context) => {
        const { taskInstance, fakeRequest } = context;

        if (!fakeRequest) {
          throw new Error('Cannot run agent execution without a request (missing API key)');
        }

        const { executionId } = taskInstance.params as RunAgentTaskParams;
        const taskHandler = getTaskHandler();

        return {
          run: async () => {
            await taskHandler.run({ executionId, fakeRequest });
            return { state: {} };
          },
          cancel: async () => {
            await taskHandler.cancel({ executionId });
          },
        };
      },
    },
  });
};
