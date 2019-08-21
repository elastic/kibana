/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy } from 'kibana';
import { Plugin, PluginSetupContract } from './plugin';
import { SavedObjectsSerializer, SavedObjectsSchema } from '../../../../src/core/server';
import mappings from './mappings.json';
import { migrations } from './migrations';

export { PluginSetupContract as TaskManager };
export { TaskInstance, ConcreteTaskInstance, TaskRunCreatorFunction } from './task';

export function taskManager(kibana: any) {
  return new kibana.Plugin({
    id: 'task_manager',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.task_manager',
    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        max_attempts: Joi.number()
          .description(
            'The maximum number of times a task will be attempted before being abandoned as failed'
          )
          .min(1)
          .default(3),
        poll_interval: Joi.number()
          .description('How often, in milliseconds, the task manager will look for more work.')
          .min(1000)
          .default(3000),
        index: Joi.string()
          .description('The name of the index used to store task information.')
          .default('.kibana_task_manager'),
        max_workers: Joi.number()
          .description(
            'The maximum number of tasks that this Kibana instance will run simultaneously.'
          )
          .min(1) // disable the task manager rather than trying to specify it with 0 workers
          .default(10),
        override_num_workers: Joi.object()
          .pattern(/.*/, Joi.number().greater(0))
          .description(
            'Customize the number of workers occupied by specific tasks (e.g. override_num_workers.reporting: 2)'
          )
          .default({}),
      }).default();
    },
    init(server: Legacy.Server) {
      const plugin = new Plugin({
        logger: {
          get: () => ({
            info: (message: string) => server.log(['info', 'task_manager'], message),
            debug: (message: string) => server.log(['debug', 'task_manager'], message),
            warn: (message: string) => server.log(['warn', 'task_manager'], message),
            error: (message: string) => server.log(['error', 'task_manager'], message),
          }),
        },
      });
      const schema = new SavedObjectsSchema(this.kbnServer.uiExports.savedObjectSchemas);
      const serializer = new SavedObjectsSerializer(schema);
      const setupContract = plugin.setup(
        {},
        {
          serializer,
          config: server.config(),
          elasticsearch: server.plugins.elasticsearch,
          savedObjects: server.savedObjects,
        }
      );
      this.kbnServer.afterPluginsInit(() => {
        (async () => {
          // The code block below can't await directly within "afterPluginsInit"
          // callback due to circular dependency. The server isn't "ready" until
          // this code block finishes. Migrations wait for server to be ready before
          // executing. Saved objects repository waits for migrations to finish before
          // finishing the request. To avoid this, we'll await within a separate
          // function block.
          await this.kbnServer.server.kibanaMigrator.awaitMigration();
          plugin.start();
        })();
      });
      server.expose(setupContract);
    },
    uiExports: {
      mappings,
      migrations,
      savedObjectSchemas: {
        task: {
          hidden: true,
          isNamespaceAgnostic: true,
          convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
          indexPattern(config: any) {
            return config.get('xpack.task_manager.index');
          },
        },
      },
    },
  });
}
