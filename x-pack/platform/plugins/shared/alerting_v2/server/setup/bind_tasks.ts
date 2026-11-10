/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetup } from '@kbn/core-di';
import type { KibanaContainerModuleLoadOptions } from '@kbn/core-di';
import { ConfigService } from '../lib/services/config_service/config_service';
import { DispatcherTaskDefinition } from '../lib/dispatcher/task_definition';
import { AlertActionsCleanupTaskDefinition } from '../lib/tasks/alert_actions_cleanup/task_definition';
import { ApiKeyInvalidationTaskDefinition } from '../lib/tasks/invalidate_pending_api_keys/task_definition';
import { RuleExecutorTaskDefinition } from '../lib/rule_executor/task_definition';
import { TelemetryTaskDefinition } from '../lib/usage/task_definition';
import {
  TaskDefinition,
  TaskRunnerFactoryToken,
} from '../lib/services/task_run_scope_service/create_task_runner';
import type { AlertingServerSetupDependencies } from '../types';

export function bindTasks({ bind, onSetup }: KibanaContainerModuleLoadOptions) {
  // Bind task definitions - add more tasks here as needed
  bind(TaskDefinition).toConstantValue(RuleExecutorTaskDefinition);
  bind(TaskDefinition).toConstantValue(DispatcherTaskDefinition);
  bind(TaskDefinition).toConstantValue(ApiKeyInvalidationTaskDefinition);
  bind(TaskDefinition).toConstantValue(TelemetryTaskDefinition);
  bind(TaskDefinition).toConstantValue(AlertActionsCleanupTaskDefinition);

  // Register every bound task definition with Task Manager during setup. The
  // onSetup registry hook runs the handler once per bound TaskDefinition with
  // its dependencies injected inline.
  onSetup(
    TaskDefinition,
    PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager'),
    ConfigService,
    TaskRunnerFactoryToken,
    (_, definition, taskManager, configService, taskRunnerFactory) => {
      const createTaskRunner = taskRunnerFactory({
        taskRunnerClass: definition.taskRunnerClass,
        taskType: definition.taskType,
        requiresFakeRequest: definition.requiresFakeRequest,
      });

      const timeout = definition.resolveTimeout
        ? definition.resolveTimeout(configService)
        : definition.timeout;

      taskManager.registerTaskDefinitions({
        [definition.taskType]: {
          title: definition.title,
          description: definition.description,
          timeout,
          paramsSchema: definition.paramsSchema,
          stateSchemaByVersion: definition.stateSchemaByVersion,
          maxAttempts: definition.maxAttempts,
          cost: definition.cost,
          priority: definition.priority,
          createTaskRunner,
        },
      });
    }
  );
}
