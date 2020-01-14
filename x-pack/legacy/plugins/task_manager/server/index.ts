/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy } from 'kibana';
import mappings from './mappings.json';
import { migrations } from './migrations';

import { createLegacyApi, getTaskManagerSetup } from './legacy';
export { LegacyTaskManagerApi, getTaskManagerSetup, getTaskManagerStart } from './legacy';

// Once all plugins are migrated to NP, this can be removed
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TaskManager } from '../../../../plugins/task_manager/server/task_manager';

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
      })
        .unknown(true)
        .default();
    },
    init(server: Legacy.Server) {
      /*
       * We must expose the New Platform Task Manager Plugin via the legacy Api
       * as removing it now would be a breaking change - we'll remove this in v8.0.0
       */
      server.expose(
        createLegacyApi(
          getTaskManagerSetup(server)!
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
            })
        )
      );
    },
    uiExports: {
      mappings,
      migrations,
      savedObjectSchemas,
    },
  });
}
