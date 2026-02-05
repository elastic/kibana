/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnStart, PluginStart } from '@kbn/core-di';
import type { ContainerModuleLoadOptions } from 'inversify';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { initializeResources } from '../resources/register_resources';
import type { AlertingServerStartDependencies } from '../types';
import { scheduleDispatcherTask } from '../lib/dispatcher/schedule_task';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue(async (container) => {
    const resourceManager = container.get(ResourceManager);
    const logger = container.get(LoggerServiceToken);
    const esClient = container.get(EsServiceInternalToken);
    const taskManager = container.get(
      PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager')
    );

    initializeResources({
      logger,
      resourceManager,
      esClient,
    });

    scheduleDispatcherTask({ taskManager }).catch((error) => {
      logger.error({
        error,
        code: 'DISPATCHER_TASK_SCHEDULE_FAILURE',
        type: 'DispatcherTask',
      });
    });
  });
}
