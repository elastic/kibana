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
import { ChangeHistoryClientToken } from '../lib/rule_changes_history';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { initializeResources } from '../resources/register_resources';
import { scheduleApiKeyInvalidationTask } from '../lib/tasks/invalidate_pending_api_keys/schedule_task';
import { INVALIDATE_API_KEYS_TASK_ID } from '../lib/tasks/invalidate_pending_api_keys/task_definition';
import type { PluginConfig } from '../config';
import type { AlertingServerStartDependencies } from '../types';
import { scheduleDispatcherTask } from '../lib/dispatcher/schedule_task';
import { scheduleTelemetryTask } from '../lib/usage/schedule_task';
import { TASK_ID as TELEMETRY_TASK_ID } from '../lib/usage/constants';
import { initSubscribers } from '../lib/events/init_subscribers';
import { ALERTING_LOG_CODES } from '../lib/errors/error_codes';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { DISPATCHER_TASK_ID } from '../lib/dispatcher/constants';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue(async (container) => {
    const resourceManager = container.get(ResourceManager);
    const loggerService = container.get(LoggerServiceToken);
    const tasksLogger = loggerService.forSubsystem('tasks');
    const coreLogger = container.get(Logger);
    const esClient = container.get(EsServiceInternalToken);
    const changeHistoryClient = container.get(ChangeHistoryClientToken);
    const taskManager = container.get(
      PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager')
    );
    const config = container
      .get<PluginInitializerContext<PluginConfig>['config']>(PluginInitializer('config'))
      .get<PluginConfig>();

    initializeResources({
      resourceManager,
      esClient,
      coreLogger,
      changeHistoryClient,
    });

    initSubscribers(container);

    scheduleDispatcherTask({ taskManager }).catch((error) => {
      tasksLogger.error({
        error,
        code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
        labels: { task_id: DISPATCHER_TASK_ID },
      });
    });

    scheduleApiKeyInvalidationTask({
      logger: tasksLogger,
      taskManager,
      interval: config.invalidateApiKeysTask.interval,
    }).catch((error) => {
      tasksLogger.error({
        error,
        code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
        labels: { task_id: INVALIDATE_API_KEYS_TASK_ID },
      });
    });

    scheduleTelemetryTask({
      logger: tasksLogger,
      taskManager,
    }).catch((error) => {
      tasksLogger.error({
        error,
        code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
        labels: { task_id: TELEMETRY_TASK_ID },
      });
    });
  });
}
