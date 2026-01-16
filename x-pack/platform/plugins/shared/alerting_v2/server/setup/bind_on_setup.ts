/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-server';
import { registerRuleExecutorTaskDefinition } from '../lib/rule_executor/task_definition';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { registerSavedObjects } from '../saved_objects';
import { TaskRunnerFactory } from '../lib/services/task_run_scope_service/create_task_runner';
import type { AlertingServerSetupDependencies } from '../types';

export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);

    registerFeaturePrivileges(container.get(PluginSetup('features')));

    registerSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      logger,
    });

    registerRuleExecutorTaskDefinition({
      taskManager: container.get(PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager')),
      taskRunnerFactory: container.get(TaskRunnerFactory),
    });
  });
}
