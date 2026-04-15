/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnStart, PluginStart } from '@kbn/core-di';
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { initializeResources } from '../resources/register_resources';
import { scheduleApiKeyInvalidationTask } from '../lib/tasks/invalidate_pending_api_keys/schedule_task';
import type { PluginConfig } from '../config';
import type { AlertingServerStartDependencies } from '../types';
import { scheduleDispatcherTask } from '../lib/dispatcher/schedule_task';
import { scheduleTelemetryTask } from '../lib/usage/schedule_task';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue(async (container) => {
    const resourceManager = container.get(ResourceManager);
    const logger = container.get(Logger);
    const esClient = container.get(EsServiceInternalToken);
    const taskManager = container.get(
      PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager')
    );
    const config = container
      .get<PluginInitializerContext<PluginConfig>['config']>(PluginInitializer('config'))
      .get<PluginConfig>();

    initializeResources({
      resourceManager,
      esClient,
      logger,
    });

    scheduleDispatcherTask({ taskManager, resourceManager }).catch((error) => {
      logger.error(error as Error, {
        error: {
          code: 'DISPATCHER_TASK_SCHEDULE_FAILURE',
          type: 'DispatcherTask',
        },
      });
    });

    scheduleApiKeyInvalidationTask({
      logger,
      taskManager,
      interval: config.invalidateApiKeysTask.interval,
    }).catch((error) => {
      logger.error(error as Error, {
        error: {
          code: 'API_KEY_INVALIDATION_TASK_SCHEDULE_FAILURE',
          type: 'ApiKeyInvalidationTask',
        },
      });
    });

    scheduleTelemetryTask({
      logger,
      taskManager,
    }).catch((error) => {
      logger.error(error as Error, {
        error: {
          code: 'TELEMETRY_TASK_SCHEDULE_FAILURE',
          type: 'AlertingV2TelemetryTask',
        },
      });
    });
  });
}
