/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetupDependencies } from '../../types';
import type { TaskRunnerInternalFactory } from '../services/task_run_scope_service/create_task_runner_internal';
import { DispatcherTaskRunner } from './task_runner';

export const DISPATCHER_TASK_TYPE = 'alerting_v2:dispatcher' as const;
export const DISPATCHER_TASK_ID = 'alerting_v2:dispatcher:1.0.0' as const;

export function registerDispatcherTaskDefinition({
  taskManager,
  taskRunnerInternalFactory,
}: {
  taskManager: AlertingServerSetupDependencies['taskManager'];
  taskRunnerInternalFactory: TaskRunnerInternalFactory;
}) {
  const createTaskRunner = taskRunnerInternalFactory({
    taskRunnerClass: DispatcherTaskRunner,
  });

  taskManager.registerTaskDefinitions({
    [DISPATCHER_TASK_TYPE]: {
      title: 'Alerting v2 dispatcher (ES|QL)',
      timeout: '1m',
      maxAttempts: 1,
      createTaskRunner,
    },
  });
}
