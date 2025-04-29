/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';

import { appContextService } from '../../services';

import { type BulkUpgradeTaskParams, _runBulkUpgradeTask } from './run_bulk_upgrade';
import { type BulkUninstallTaskParams, _runBulkUninstallTask } from './run_bulk_uninstall';
import {
  type BulkPackageOperationsTaskParams,
  type BulkPackageOperationsTaskState,
  TASK_TIMEOUT,
  TASK_TITLE,
  TASK_TYPE,
  formatError,
} from './utils';

export function registerPackagesBulkOperationTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        const abortController = new AbortController();
        const logger = appContextService.getLogger();

        return {
          run: async () => {
            logger.debug(`Starting bulk package operations: ${taskInstance.params.type}`);
            if (taskInstance.state.isDone) {
              return;
            }

            const taskParams = taskInstance.params as BulkPackageOperationsTaskParams;
            try {
              let results: BulkPackageOperationsTaskState['results'];
              if (taskParams.type === 'bulk_uninstall') {
                results = await _runBulkUninstallTask({
                  abortController,
                  logger,
                  taskParams: taskParams as BulkUninstallTaskParams,
                });
              } else if (taskParams.type === 'bulk_upgrade') {
                results = await _runBulkUpgradeTask({
                  abortController,
                  logger,
                  taskParams: taskParams as BulkUpgradeTaskParams,
                });
              }
              const state: BulkPackageOperationsTaskState = {
                isDone: true,
                results,
              };
              return {
                runAt: new Date(Date.now() + 60 * 60 * 1000),
                state,
              };
            } catch (error) {
              logger.error(`Packages bulk operation: ${taskParams.type} failed`, { error });
              return {
                runAt: new Date(Date.now() + 60 * 60 * 1000),
                state: {
                  isDone: true,
                  error: formatError(error),
                },
              };
            }
          },
          cancel: async () => {
            logger.debug(`Bulk package operations timed out: ${taskInstance.params.type}`);
            abortController.abort('task timed out');
          },
        };
      },
    },
  });
}
