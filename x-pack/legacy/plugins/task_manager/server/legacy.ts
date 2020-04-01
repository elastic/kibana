/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'src/legacy/server/kbn_server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../plugins/task_manager/server';

import { Middleware } from '../../../../plugins/task_manager/server/lib/middleware.js';
import {
  TaskDictionary,
  TaskInstanceWithDeprecatedFields,
  TaskInstanceWithId,
  TaskDefinition,
} from '../../../../plugins/task_manager/server/task.js';
import { SearchOpts } from '../../../../plugins/task_manager/server/task_store.js';

// Once all plugins are migrated to NP and we can remove Legacy TaskManager in version 8.0.0,
// this can be removed
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TaskManager } from '../../../../plugins/task_manager/server/task_manager';

export type LegacyTaskManagerApi = Pick<
  TaskManagerSetupContract,
  'addMiddleware' | 'registerTaskDefinitions'
> &
  TaskManagerStartContract;

export function getTaskManagerSetup(server: Server): TaskManagerSetupContract | undefined {
  return server?.newPlatform?.setup?.plugins?.taskManager as TaskManagerSetupContract;
}

export function getTaskManagerStart(server: Server): TaskManagerStartContract | undefined {
  return server?.newPlatform?.start?.plugins?.taskManager as TaskManagerStartContract;
}

export function createLegacyApi(legacyTaskManager: Promise<TaskManager>): LegacyTaskManagerApi {
  return {
    addMiddleware: (middleware: Middleware) => {
      legacyTaskManager.then((tm: TaskManager) => tm.addMiddleware(middleware));
    },
    registerTaskDefinitions: (taskDefinitions: TaskDictionary<TaskDefinition>) => {
      legacyTaskManager.then((tm: TaskManager) => tm.registerTaskDefinitions(taskDefinitions));
    },
    fetch: (opts: SearchOpts) => legacyTaskManager.then((tm: TaskManager) => tm.fetch(opts)),
    get: (id: string) => legacyTaskManager.then((tm: TaskManager) => tm.get(id)),
    remove: (id: string) => legacyTaskManager.then((tm: TaskManager) => tm.remove(id)),
    schedule: (taskInstance: TaskInstanceWithDeprecatedFields, options?: any) =>
      legacyTaskManager.then((tm: TaskManager) => tm.schedule(taskInstance, options)),
    runNow: (taskId: string) => legacyTaskManager.then((tm: TaskManager) => tm.runNow(taskId)),
    ensureScheduled: (taskInstance: TaskInstanceWithId, options?: any) =>
      legacyTaskManager.then((tm: TaskManager) => tm.ensureScheduled(taskInstance, options)),
  };
}
