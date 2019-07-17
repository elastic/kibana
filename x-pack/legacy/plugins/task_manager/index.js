/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsSerializer, SavedObjectsSchema } from '../../../../src/core/server';
import { TaskManager } from './task_manager';
import mappings from './mappings.json';
import migrations from './migrations';
import { TASK_MANAGER_INDEX } from './constants';

export function taskManager(kibana) {
  return new kibana.Plugin({
    id: 'task_manager',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.task_manager',
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        max_attempts: Joi.number()
          .description('The maximum number of times a task will be attempted before being abandoned as failed')
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
          .description('The maximum number of tasks that this Kibana instance will run simultaneously.')
          .min(1) // disable the task manager rather than trying to specify it with 0 workers
          .default(10),
        override_num_workers: Joi.object()
          .pattern(/.*/, Joi.number().greater(0))
          .description('Customize the number of workers occupied by specific tasks (e.g. override_num_workers.reporting: 2)')
          .default({})
      }).default();
    },
    init(server) {
      const config = server.config();
      const schema = new SavedObjectsSchema(this.kbnServer.uiExports.savedObjectSchemas);
      const serializer = new SavedObjectsSerializer(schema);
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const savedObjectsRepository = server.savedObjects.getSavedObjectsRepository(
        callWithInternalUser,
        ['task']
      );

      const taskManager = new TaskManager({
        kbnServer: this.kbnServer,
        config,
        savedObjectsRepository,
        serializer,
      });
      server.decorate('server', 'taskManager', taskManager);
    },
    uiExports: {
      mappings,
      migrations,
      savedObjectSchemas: {
        task: {
          hidden: true,
          isNamespaceAgnostic: true,
          indexPattern: TASK_MANAGER_INDEX,
          convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
        },
      },
    },
  });
}
