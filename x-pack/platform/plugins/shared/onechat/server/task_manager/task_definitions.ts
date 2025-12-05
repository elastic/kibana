/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';

export const taskTypes = {
  runAgent: 'agent-builder:run-agent',
};

export const registerTaskDefinitions = ({
  taskManager,
}: {
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [taskTypes.runAgent]: {
      title: 'Run Agent',
      description: 'Run an agent',
      timeout: '1d',
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance, fakeRequest }) => {
        if (!fakeRequest) {
          throw new Error('Cannot run agent without a request');
        }
        const abortController = new AbortController();

        const params = taskInstance.params;

        return {
          run: async () => {
            // TODO: we need to call the executor here.
          },
          cancel: async () => {
            abortController.abort();
          },
        };
      },
    },
  });
};
