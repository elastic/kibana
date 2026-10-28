/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { AGENT_WORKLOAD_TYPE } from '../../agents/service_account_binding';
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
  getStartServices,
}: {
  taskManager: TaskManagerSetupContract;
  getTaskHandler: () => TaskHandler;
  getStartServices: CoreSetup['getStartServices'];
}) => {
  taskManager.registerTaskDefinitions({
    [taskTypes.runAgent]: {
      title: 'Agent Builder: Run agent execution',
      timeout: '20m',
      maxAttempts: 1,
      // A bound execution runs as the service account bound to its agent: Task Manager mints the
      // credential through Core instead of cloning the caller's API key.
      runAs: {
        workloadTypes: [AGENT_WORKLOAD_TYPE],
        withScopedRequest: async (params, fn) => {
          const [coreStart] = await getStartServices();
          return coreStart.security.serviceAccounts.withScopedRequestForWorkload(params, fn);
        },
      },
      createTaskRunner: (context) => {
        const { taskInstance, fakeRequest, runAs } = context;

        if (!fakeRequest && !runAs) {
          throw new Error(
            'Cannot run agent execution without a request (missing API key or service account)'
          );
        }

        const { executionId } = taskInstance.params as RunAgentTaskParams;
        const taskHandler = getTaskHandler();

        return {
          run: async () => {
            await taskHandler.run({ executionId, fakeRequest, runAs });
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
