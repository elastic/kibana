/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy } from 'kibana';
import mappings from './mappings.json';
import { migrations } from './migrations';
import { TaskManagerSetupContract } from '../../../../plugins/task_manager/server';
import { LegacyTaskManagerApi } from './legacy';

export { LegacyTaskManagerApi, getTaskManagerSetup, getTaskManagerStart } from './legacy';

// Once all plugins are migrated to NP, this can be removed
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TaskManager } from '../../../../plugins/task_manager/server/task_manager';
import { Middleware } from '../../../../plugins/task_manager/server/lib/middleware.js';
import {
  TaskDictionary,
  TaskInstanceWithDeprecatedFields,
  TaskInstanceWithId,
  TaskDefinition,
} from '../../../../plugins/task_manager/server/task.js';
import { FetchOpts } from '../../../../plugins/task_manager/server/task_store.js';

const savedObjectSchemas = {
  task: {
    hidden: true,
    isNamespaceAgnostic: true,
    convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
    indexPattern(config: any) {
      return config.get('xpack.task_manager.index');
    },
  },
};

export function taskManager(kibana: any) {
  return new kibana.Plugin({
    id: 'task_manager',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.task_manager',
    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        index: Joi.string()
          .description('The name of the index used to store task information.')
          .default('.kibana_task_manager')
          .invalid(['.tasks']),
      }).default();
    },
    init(server: Legacy.Server) {
      const {
        newPlatform: {
          setup: {
            plugins: { taskManager: taskManagerPluginApi },
          },
        },
      } = server;

      const legacyTaskManager = (taskManagerPluginApi as TaskManagerSetupContract)
        .registerLegacyAPI({
          savedObjectSchemas,
        })
        .then((taskManagerPlugin: TaskManager) => {
          // we can't tell the Kibana Platform Task Manager plugin to
          // to wait to `start` as that happens before legacy plugins
          // instead we will start the internal Task Manager plugin when
          // all legacy plugins have finished initializing
          // Once all plugins are migrated to NP, this can be removed
          this.kbnServer.afterPluginsInit(() => {
            taskManagerPlugin.start();
          });
          return taskManagerPlugin;
        });
      /*
       * We must expose the New Platform Task Manager Plugin via the legacy Api
       * as that would be a breaking change - we'll remove this in v8.0.0
       */
      const legacyApi: LegacyTaskManagerApi = {
        addMiddleware: (middleware: Middleware) =>
          legacyTaskManager.then((tm: TaskManager) => tm.addMiddleware(middleware)),
        registerTaskDefinitions: (taskDefinitions: TaskDictionary<TaskDefinition>) =>
          legacyTaskManager.then((tm: TaskManager) => tm.registerTaskDefinitions(taskDefinitions)),
        fetch: (opts: FetchOpts) => legacyTaskManager.then((tm: TaskManager) => tm.fetch(opts)),
        remove: (id: string) => legacyTaskManager.then((tm: TaskManager) => tm.remove(id)),
        schedule: (taskInstance: TaskInstanceWithDeprecatedFields, options?: any) =>
          legacyTaskManager.then((tm: TaskManager) => tm.schedule(taskInstance, options)),
        runNow: (taskId: string) => legacyTaskManager.then((tm: TaskManager) => tm.runNow(taskId)),
        ensureScheduled: (taskInstance: TaskInstanceWithId, options?: any) =>
          legacyTaskManager.then((tm: TaskManager) => tm.ensureScheduled(taskInstance, options)),
      };
      server.expose(legacyApi);
    },
    uiExports: {
      mappings,
      migrations,
      savedObjectSchemas,
    },
  });
}
