/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaContainerModuleLoadOptions, PluginSetup } from '@kbn/core-di';
import { PluginInitializer } from '@kbn/core-di-server';
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

export function bindTasks({ bind, onSetup }: KibanaContainerModuleLoadOptions) {
  onSetup(
    TaskDefinition,
    PluginInitializer('config'),
    PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager'),
    TaskRunnerFactoryToken,
    (_, definition, configService, taskManager, taskRunnerFactory) => {
      const config = configService.get<PluginConfig>();

      let timeout = definition.timeout;

      const createTaskRunner = taskRunnerFactory({
        taskRunnerClass: definition.taskRunnerClass,
        taskType: definition.taskType,
        requiresFakeRequest: definition.requiresFakeRequest,
      });
      if (definition.resolveTimeout) {
        timeout = definition.resolveTimeout(config);
      }

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
    }
  );

  // Bind task definitions - add more tasks here as needed
  bind(TaskDefinition).toConstantValue(RuleExecutorTaskDefinition);
  bind(TaskDefinition).toConstantValue(DispatcherTaskDefinition);
  bind(TaskDefinition).toConstantValue(ApiKeyInvalidationTaskDefinition);
  bind(TaskDefinition).toConstantValue(TelemetryTaskDefinition);
}
