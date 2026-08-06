/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnSetup, PluginSetup } from '@kbn/core-di';
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { DispatcherTaskDefinition } from '../lib/dispatcher/task_definition';
import { ApiKeyInvalidationTaskDefinition } from '../lib/tasks/invalidate_pending_api_keys/task_definition';
import { RuleExecutorTaskDefinition } from '../lib/rule_executor/task_definition';
import { TelemetryTaskDefinition } from '../lib/usage/task_definition';
import {
  TaskDefinition,
  TaskRunnerFactoryToken,
} from '../lib/services/task_run_scope_service/create_task_runner';
import type { AlertingServerSetupDependencies } from '../types';
import type { PluginConfig } from '../config';
import { getTaskTimeout } from '../lib/get_task_timeout';

export function bindTasks({ bind, onActivation }: ContainerModuleLoadOptions) {
  // Register task with Task Manager when the binding is activated
  onActivation(TaskDefinition, ({ get }, definition) => {
    const config = get<PluginInitializerContext<PluginConfig>['config']>(
      PluginInitializer('config')
    ).get<PluginConfig>();

    const taskManager = get(
      PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager')
    );
    const taskRunnerFactory = get(TaskRunnerFactoryToken);

    const createTaskRunner = taskRunnerFactory({
      taskRunnerClass: definition.taskRunnerClass,
      taskType: definition.taskType,
      requiresFakeRequest: definition.requiresFakeRequest,
    });

    const timeout = getTaskTimeout(config, definition);

    taskManager.registerTaskDefinitions({
      [definition.taskType]: {
        title: definition.title,
        timeout,
        paramsSchema: definition.paramsSchema,
        stateSchemaByVersion: definition.stateSchemaByVersion,
        maxAttempts: definition.maxAttempts,
        createTaskRunner,
      },
    });

    return definition;
  });

  // Bind task definitions - add more tasks here as needed
  bind(TaskDefinition).toConstantValue(RuleExecutorTaskDefinition);
  bind(TaskDefinition).toConstantValue(DispatcherTaskDefinition);
  bind(TaskDefinition).toConstantValue(ApiKeyInvalidationTaskDefinition);
  bind(TaskDefinition).toConstantValue(TelemetryTaskDefinition);

  // Resolve every bound task definition during setup so the onActivation hook
  // above runs once per task and registers it with Task Manager.
  bind(OnSetup).toConstantValue((container) => {
    container.getAll(TaskDefinition);
  });
}
