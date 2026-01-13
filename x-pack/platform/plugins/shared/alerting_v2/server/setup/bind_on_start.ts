/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnStart } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';

import { TaskRunScopeService } from '../lib/services/task_run_scope_service/task_run_scope_service';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue((container) => {
    const taskRunScopeService = container.get(TaskRunScopeService);
    const injection = container.get(CoreStart('injection'));
    taskRunScopeService.initialize(injection);
  });
}
