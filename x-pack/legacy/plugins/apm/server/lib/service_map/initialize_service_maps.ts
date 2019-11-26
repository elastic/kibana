/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
// @ts-ignore
import { TaskManager, RunContext } from '../legacy/plugins/task_manager';
import { runServiceMapTask } from './run_service_map_task';
import { setupRequiredScripts } from './setup_required_scripts';

export async function initializeServiceMaps(server: Server) {
  const config = server.config();

  setupRequiredScripts(server).catch(error => {
    server.log(
      'error',
      'Unable to set up required scripts for APM Service Maps:'
    );
    server.log('error', error);
  });

  const taskManager = server.plugins.task_manager;
  if (taskManager) {
    // @ts-ignore
    const kbnServer = this.kbnServer;
    taskManager.registerTaskDefinitions({
      // serviceMap is the task type, and must be unique across the entire system
      serviceMap: {
        // Human friendly name, used to represent this task in logs, UI, etc
        title: 'ServiceMapTask',
        type: 'serviceMap',

        // Optional, human-friendly, more detailed description
        description: 'Extract connections in traces for service maps',

        // Optional, how long, in minutes, the system should wait before
        // a running instance of this task is considered to be timed out.
        // This defaults to 5 minutes.
        timeout: '5m',

        // The serviceMap task occupies 2 workers, so if the system has 10 worker slots,
        // 5 serviceMap tasks could run concurrently per Kibana instance. This value is
        // overridden by the `override_num_workers` config value, if specified.
        // numWorkers: 1,

        // The createTaskRunner function / method returns an object that is responsible for
        // performing the work of the task. context: { taskInstance, kbnServer }, is documented below.
        createTaskRunner({ taskInstance }: RunContext) {
          // Perform the work of the task. The return value should fit the TaskResult interface, documented
          // below. Invalid return values will result in a logged warning.
          return {
            async run() {
              const { state } = taskInstance;

              const { mostRecent } = await runServiceMapTask(
                kbnServer,
                config,
                state.lastRun
              );
              // console.log(`Task run count: ${(state.count || 0) + 1}`);

              return {
                state: {
                  count: (state.count || 0) + 1,
                  lastRun: mostRecent
                }
              };
            }
          };
        }
      }
    });

    // @ts-ignore
    this.kbnServer.afterPluginsInit(async () => {
      const fetchedTasks = await taskManager.fetch({
        query: {
          bool: {
            must: [
              {
                term: {
                  _id: 'task:servicemap-processor'
                }
              },
              {
                term: {
                  'task.taskType': 'serviceMap'
                }
              }
            ]
          }
        }
      });
      if (fetchedTasks.docs.length) {
        await taskManager.remove('servicemap-processor');
      }
      await taskManager.schedule({
        id: 'servicemap-processor',
        taskType: 'serviceMap',
        interval: '1m',
        scope: ['apm'],
        params: {},
        state: {}
      });
    });
  }
}
