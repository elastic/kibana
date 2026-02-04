/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { PluginSetup } from '@kbn/core-di';
import {
  TaskDefinition,
  TaskRunnerFactoryToken,
} from '../lib/services/task_run_scope_service/create_task_runner';
import { RuleExecutorTaskDefinition } from '../lib/rule_executor/task_definition';
import { DispatcherTaskDefinition } from '../lib/dispatcher/task_definition';
import type { AlertingServerSetupDependencies } from '../types';

export function bindTasks({ bind, onActivation }: ContainerModuleLoadOptions) {
  // Register task with Task Manager when the binding is activated
  onActivation(TaskDefinition, ({ get }, definition) => {
    const taskManager = get(
      PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager')
    );
    const taskRunnerFactory = get(TaskRunnerFactoryToken);

    const createTaskRunner = taskRunnerFactory({
      taskRunnerClass: definition.taskRunnerClass,
      taskType: definition.taskType,
      requiresFakeRequest: definition.requiresFakeRequest,
    });

    taskManager.registerTaskDefinitions({
      [definition.taskType]: {
        title: definition.title,
        timeout: definition.timeout,
        createTaskRunner,
        ...(definition.paramsSchema && { paramsSchema: definition.paramsSchema }),
        ...(definition.maxAttempts && { maxAttempts: definition.maxAttempts }),
      },
    });

    return definition;
  });

  // Bind task definitions
  bind(TaskDefinition).toConstantValue(RuleExecutorTaskDefinition);
  bind(TaskDefinition).toConstantValue(DispatcherTaskDefinition);
}
