/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnStart, PluginStart } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';
import { ChangeHistoryClientToken } from '../lib/rule_changes_history';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { initializeResources } from '../resources/register_resources';
import { scheduleApiKeyInvalidationTask } from '../lib/tasks/invalidate_pending_api_keys/schedule_task';
import { INVALIDATE_API_KEYS_TASK_ID } from '../lib/tasks/invalidate_pending_api_keys/task_definition';
import { ConfigService } from '../lib/services/config_service/config_service';
import type { AlertingServerStartDependencies } from '../types';
import { scheduleAlertActionsCleanupTask } from '../lib/tasks/alert_actions_cleanup/schedule_task';
import { ALERT_ACTIONS_CLEANUP_TASK_ID } from '../lib/tasks/alert_actions_cleanup/constants';
import { scheduleDispatcherTask } from '../lib/dispatcher/schedule_task';
import { scheduleTelemetryTask } from '../lib/usage/schedule_task';
import { TASK_ID as TELEMETRY_TASK_ID } from '../lib/usage/constants';
import { initSubscribers } from '../lib/events/init_subscribers';
import { ALERTING_LOG_CODES } from '../lib/errors/error_codes';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { DISPATCHER_TASK_ID } from '../lib/dispatcher/constants';
import { installAlertingV2ManagedWorkflows } from '../lib/workflow_extensions/managed_workflows';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toResolvedValue(
    (
        resourceManager,
        loggerService,
        coreLogger,
        esClient,
        changeHistoryClient,
        userProfileService,
        taskManager,
        configService,
        workflowsExtensions
      ) =>
      async (container) => {
        const tasksLogger = loggerService.forSubsystem('tasks');
        const resourcesLogger = loggerService.forSubsystem('resources');

        initializeResources({
          resourceManager,
          esClient,
          logger: resourcesLogger,
          // `@kbn/data-streams` takes a core Logger. The child keeps its lines
          // under the same `log.logger` as the resources subsystem.
          coreLogger: coreLogger.get('resources'),
          changeHistoryClient,
          retention: configService.get('retention'),
          userProfileService,
        });

        initSubscribers(container);

        try {
          await installAlertingV2ManagedWorkflows(workflowsExtensions);
        } catch (error) {
          resourcesLogger.warn({
            message: 'Failed to install managed workflows',
            code: ALERTING_LOG_CODES.RESOURCES_MANAGED_WORKFLOWS_INSTALL_FAILED,
            error,
          });
        }

        if (configService.get('dispatcher.paused')) {
          tasksLogger.warn({
            code: ALERTING_LOG_CODES.DISPATCHER_PAUSED,
            labels: { task_id: DISPATCHER_TASK_ID },
            message:
              'alerting v2 dispatcher is paused by xpack.alerting_v2.dispatcher.paused; no ' +
              'notifications are sent and pending alerts are dispatched late once it is removed',
          });
        }

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
          interval: configService.get('invalidateApiKeysTask.interval'),
        }).catch((error) => {
          tasksLogger.error({
            error,
            code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
            labels: { task_id: INVALIDATE_API_KEYS_TASK_ID },
          });
        });

        scheduleAlertActionsCleanupTask({
          logger: tasksLogger,
          taskManager,
          enabled: configService.get('retention.alertActions.dispatcher.enabled'),
        }).catch((error) => {
          tasksLogger.error({
            error,
            code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
            labels: { task_id: ALERT_ACTIONS_CLEANUP_TASK_ID },
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
      },
    [
      ResourceManager,
      LoggerServiceToken,
      Logger,
      EsServiceInternalToken,
      ChangeHistoryClientToken,
      CoreStart('userProfile'),
      PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager'),
      ConfigService,
      PluginStart<AlertingServerStartDependencies['workflowsExtensions']>('workflowsExtensions'),
    ]
  );
}
