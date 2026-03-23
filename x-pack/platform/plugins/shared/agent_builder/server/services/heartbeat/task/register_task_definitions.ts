/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { HeartbeatTaskHandler } from './heartbeat_task_handler';
import { heartbeatTaskTypes, type RunHeartbeatTaskParams } from './task_definitions';

/**
 * Register the heartbeat task definition with Task Manager.
 * Must be called during plugin setup.
 */
export const registerHeartbeatTaskDefinitions = ({
  taskManager,
  getHeartbeatTaskHandler,
}: {
  taskManager: TaskManagerSetupContract;
  getHeartbeatTaskHandler: () => HeartbeatTaskHandler;
}) => {
  taskManager.registerTaskDefinitions({
    [heartbeatTaskTypes.runHeartbeat]: {
      title: 'Agent Builder: Run heartbeat',
      timeout: '20m',
      // maxAttempts: 1 — retry logic is handled inside the task handler itself
      maxAttempts: 1,
      createTaskRunner: (context) => {
        const { taskInstance, fakeRequest } = context;

        if (!fakeRequest) {
          throw new Error('Cannot run heartbeat without a request (missing API key)');
        }

        const { heartbeatId } = taskInstance.params as RunHeartbeatTaskParams;
        const handler = getHeartbeatTaskHandler();

        return {
          run: async () => {
            await handler.run({ heartbeatId, fakeRequest });
            // Always return normally — errors are handled inside run()
            // so the recurring schedule is never disrupted
            return { state: {} };
          },
        };
      },
    },
  });
};
