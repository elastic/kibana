/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type KibanaContainerModuleLoadOptions,
  Logger,
  OnSetup,
  OnStart,
  PluginSetup,
  PluginStart,
} from '@kbn/core-di';
import type { Logger as ILogger } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  CLEANUP_TASK_COST,
  CLEANUP_TASK_ID,
  CLEANUP_TASK_SCHEDULE,
  CLEANUP_TASK_TIMEOUT,
  CLEANUP_TASK_TITLE,
  CLEANUP_TASK_TYPE,
} from '../cleanup_task/cleanup_task';
import { NotificationCleanupService } from '../cleanup_task/cleanup_expired_notifications';

export const bindTasks = ({ bind }: KibanaContainerModuleLoadOptions): void => {
  bind(OnSetup).toDynamicValue(({ get, inject }) => {
    // Task Manager needs the definition at setup, but the runner resolves the cleanup service on
    // the first run; `inject` holds that resolution until the plugin has started.
    const run = inject<void, [AbortSignal], [NotificationCleanupService]>(
      NotificationCleanupService,
      (cleanup, signal) => cleanup.run(signal)
    );

    return () => {
      const taskManager = get(PluginSetup<TaskManagerSetupContract>('taskManager'));
      taskManager.registerTaskDefinitions({
        [CLEANUP_TASK_TYPE]: {
          title: CLEANUP_TASK_TITLE,
          timeout: CLEANUP_TASK_TIMEOUT,
          cost: CLEANUP_TASK_COST,
          createTaskRunner: ({ signal }: RunContext) => ({ run: () => run(signal) }),
        },
      });
    };
  });

  bind(OnStart).toResolvedValue(
    (taskManager: TaskManagerStartContract, logger: ILogger) => () => {
      taskManager
        .ensureScheduled({
          id: CLEANUP_TASK_ID,
          taskType: CLEANUP_TASK_TYPE,
          schedule: CLEANUP_TASK_SCHEDULE,
          state: {},
          params: {},
        })
        .catch((err) => {
          logger.error(`Failed to schedule Notification Center cleanup task: ${err.message}`);
        });
    },
    [PluginStart<TaskManagerStartContract>('taskManager'), Logger]
  );
};
