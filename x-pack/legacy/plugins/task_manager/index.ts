/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy } from 'kibana';
import { createShim } from './shim';
import { TaskManager } from './task_manager';
import { TaskManagerContract } from './types';

export { TaskManagerContract };
export { TaskInstance, ConcreteTaskInstance } from './task';

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
          .min(0) // no retries
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
      const { plugins } = createShim(server);
      const config = server.config();
      const services = {
        log: (msg: any) => server.log(msg),
        elasticsearch: plugins.elasticsearch,
      };
      const taskManagerInstance = new TaskManager(
        services,
        config,
        this.kbnServer.afterPluginsInit
      );
      const exposedFunctions: TaskManagerContract = {
        fetch: taskManagerInstance.fetch.bind(taskManagerInstance),
        remove: taskManagerInstance.remove.bind(taskManagerInstance),
        schedule: taskManagerInstance.schedule.bind(taskManagerInstance),
        addMiddleware: taskManagerInstance.addMiddleware.bind(taskManagerInstance),
        registerTaskDefinitions: taskManagerInstance.registerTaskDefinitions.bind(
          taskManagerInstance
        ),
      };
      server.expose(exposedFunctions);
    },
  });
}
