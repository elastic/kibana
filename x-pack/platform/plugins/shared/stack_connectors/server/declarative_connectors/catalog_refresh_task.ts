/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { DeclarativeCatalogService } from './catalog_service';

export const CATALOG_REFRESH_TASK_TYPE = 'stack_connectors:catalog_refresh';
export const CATALOG_REFRESH_TASK_ID = 'stack_connectors-catalog_refresh';
export const CATALOG_REFRESH_TASK_TIMEOUT = '2m';

export const refreshIntervalToSchedule = (refreshIntervalMs: number): string =>
  `${Math.round(refreshIntervalMs / 1000)}s`;

export function registerCatalogRefreshTask(
  taskManager: TaskManagerSetupContract,
  getService: () => DeclarativeCatalogService | undefined
): void {
  taskManager.registerTaskDefinitions({
    [CATALOG_REFRESH_TASK_TYPE]: {
      title: 'Declarative connector catalog refresh',
      timeout: CATALOG_REFRESH_TASK_TIMEOUT,
      paramsSchema: schema.object({}),
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          if (signal.aborted) {
            return { state: {} };
          }
          const service = getService();
          if (!service) {
            return { state: {} };
          }
          await service.refreshFromRegistry();
          return { state: {} };
        },
      }),
    },
  });
}

export async function scheduleCatalogRefreshTask(
  taskManager: TaskManagerStartContract,
  interval: string,
  logger: Logger
): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: CATALOG_REFRESH_TASK_ID,
      taskType: CATALOG_REFRESH_TASK_TYPE,
      params: {},
      state: {},
      schedule: { interval },
    });
  } catch (error) {
    logger.error(
      `Error scheduling ${CATALOG_REFRESH_TASK_ID}, received ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
