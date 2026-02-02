/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { AlertingServerSetupDependencies } from '../../types';
import type { AlertingTaskRunner } from '../services/task_run_scope_service/create_task_runner';

export const DISPATCHER_TASK_TYPE = 'alerting_v2:dispatcher' as const;
export const DISPATCHER_TASK_ID = 'alerting_v2:dispatcher:1.0.0' as const;

export function registerDispatcherTaskDefinition({
  taskManager,
  dispatcherTaskRunner,
}: {
  taskManager: AlertingServerSetupDependencies['taskManager'];
  dispatcherTaskRunner: AlertingTaskRunner;
}) {
  taskManager.registerTaskDefinitions({
    [DISPATCHER_TASK_TYPE]: {
      title: 'Alerting v2 dispatcher (ES|QL)',
      timeout: '5m',
      maxAttempts: 1,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        return {
          run: async () => {
            return dispatcherTaskRunner.run({ taskInstance, abortController });
          },
        };
      },
    },
  });
}
