/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy } from 'kibana';
import {
  PluginContract,
  LifecycleContract,
  createTaskManager,
  LegacyDeps,
} from './create_task_manager';
import {
  SavedObjectsSerializer,
  SavedObjectsSchema,
  CoreSetup,
} from '../../../../../src/core/server';
import mappings from './mappings.json';
import { migrations } from './migrations';
import { TaskManagerPluginSetupContract } from '../../../../plugins/kibana_task_manager/server';
export { Middleware } from './lib/middleware';
export { TaskDictionary, TaskDefinition } from './task';

export { PluginContract as TaskManager, LifecycleContract };
export {
  TaskInstance,
  ConcreteTaskInstance,
  TaskRunCreatorFunction,
  TaskStatus,
  RunContext,
} from './task';

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
          .min(100)
          .default(3000),
        request_capacity: Joi.number()
          .description('How many requests can Task Manager buffer before it rejects new requests.')
          .min(1)
          // a nice round contrived number, feel free to change as we learn how it behaves
          .default(1000),
        index: Joi.string()
          .description('The name of the index used to store task information.')
          .default('.kibana_task_manager')
          .invalid(['.tasks']),
        max_workers: Joi.number()
          .description(
            'The maximum number of tasks that this Kibana instance will run simultaneously.'
          )
          .min(1) // disable the task manager rather than trying to specify it with 0 workers
          .default(10),
      }).default();
    },
    async init(server: Legacy.Server) {
      const schema = new SavedObjectsSchema(this.kbnServer.uiExports.savedObjectSchemas);
      const serializer = new SavedObjectsSerializer(schema);

      const {
        savedObjects,
        newPlatform: {
          setup: {
            plugins: { kibanaTaskManager },
          },
        },
      } = server;

      await (kibanaTaskManager as TaskManagerPluginSetupContract).registerLegacyAPI(
        (core: CoreSetup, deps: Omit<LegacyDeps, 'savedObjects' | 'serializer'>) => {
          const tm = createTaskManager(core, { ...deps, serializer, savedObjects });
          this.kbnServer.afterPluginsInit(() => {
            tm.start();
          });
          return tm;
        }
      );
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
