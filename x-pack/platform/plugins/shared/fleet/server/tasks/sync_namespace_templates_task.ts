/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';

import { appContextService } from '../services';
import { syncNamespaceTemplates } from '../services/epm/packages';

const TASK_TYPE = 'fleet:sync_namespace_templates';

export interface SyncNamespaceTemplatesTaskParams {
  spaceId: string;
  packageName: string;
  addedNamespaces: string[];
  removedNamespaces: string[];
}

export function registerSyncNamespaceTemplatesTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Sync namespace templates',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        const { spaceId, packageName, addedNamespaces, removedNamespaces } =
          taskInstance.params as SyncNamespaceTemplatesTaskParams;
        return {
          async run() {
            if (addedNamespaces.length === 0 && removedNamespaces.length === 0) {
              return;
            }

            const logger = appContextService.getLogger();
            logger.debug(
              `[syncNamespaceTemplatesTask] Running for package ${packageName} in space ${spaceId}: adding [${addedNamespaces}], removing [${removedNamespaces}]`
            );

            const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
            const esClient = appContextService.getInternalUserESClient();

            await syncNamespaceTemplates({
              soClient,
              esClient,
              packageName,
              addedNamespaces,
              removedNamespaces,
              abortController,
            });
          },
        };
      },
    },
  });
}

export async function scheduleSyncNamespaceTemplatesTask(
  taskManagerStart: TaskManagerStartContract,
  params: SyncNamespaceTemplatesTaskParams
) {
  if (params.addedNamespaces.length === 0 && params.removedNamespaces.length === 0) {
    return;
  }

  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${uuidv4()}`,
    scope: ['fleet'],
    params,
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}
