/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { AlertingServerSetupDependencies } from '../../types';
import type { TaskRunnerFactory } from '../services/task_run_scope_service/create_task_runner';
import { DispatcherTaskRunner } from './task_runner';

export const DISPATCHER_TASK_TYPE = 'alerting_v2:dispatcher' as const;

export function registerDispatcherTaskDefinition({
  taskManager,
  taskRunnerFactory,
}: {
  taskManager: AlertingServerSetupDependencies['taskManager'];
  taskRunnerFactory: TaskRunnerFactory;
}) {
  const createTaskRunner = taskRunnerFactory({
    taskRunnerClass: DispatcherTaskRunner,
    taskType: DISPATCHER_TASK_TYPE,
  });

  taskManager.registerTaskDefinitions({
    [DISPATCHER_TASK_TYPE]: {
      title: 'Alerting v2 dispatcher (ES|QL)',
      timeout: '5m',
      stateSchemaByVersion: {
        '1': {
          schema: schema.object({
            previousStartedAt: schema.maybe(schema.string()),
          }),
          up(state) {
            return state;
          },
        },
      },
      createTaskRunner,
    },
  });
}
