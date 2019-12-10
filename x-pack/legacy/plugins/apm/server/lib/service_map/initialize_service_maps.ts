/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
// @ts-ignore
import { TaskManager, RunContext } from '../legacy/plugins/task_manager';
import { runServiceMapTask } from './run_service_map_task';
import { setupIngestPipeline } from './service-connection-es-scripts';
import {
  SERVICE_MAP_TASK_TYPE,
  SERVICE_MAP_TASK_ID
} from '../../../common/service_map_constants';
import { createServiceConnectionsIndex } from './create_service_connections_index';

export async function initializeServiceMaps(server: Server) {
  // TODO remove setupIngestPipeline when agents set destination.address (elastic/apm#115)
  setupIngestPipeline(server)
    .then(() => {
      server.log(
        ['info', 'plugins', 'apm'],
        `Created ingest pipeline to extract destination.address from span names.`
      );
    })
    .catch(error => {
      server.log(
        ['error', 'plugins', 'apm'],
        `Unable to setup the ingest pipeline to extract destination.address from span names.\n${error.stack}`
      );
    });

  await createServiceConnectionsIndex(server);

  const taskManager = server.plugins.task_manager;
  if (taskManager) {
    taskManager.registerTaskDefinitions({
      [SERVICE_MAP_TASK_TYPE]: {
        title: 'ApmServiceMapTask',
        type: SERVICE_MAP_TASK_TYPE,
        description: 'Extract connections in traces for APM service maps',
        timeout: '5m',
        createTaskRunner({ taskInstance }: RunContext) {
          return {
            async run() {
              const { state } = taskInstance;

              const { latestTransactionTime } = await runServiceMapTask(
                server,
                state.latestTransactionTime
              );

              return { state: { latestTransactionTime } };
            }
          };
        }
      }
    });

    return await taskManager.ensureScheduled({
      id: SERVICE_MAP_TASK_ID,
      taskType: SERVICE_MAP_TASK_TYPE,
      interval: '1m',
      scope: ['apm'],
      params: {},
      state: {}
    });
  }
}
