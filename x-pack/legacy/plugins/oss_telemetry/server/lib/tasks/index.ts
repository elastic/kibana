/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HapiServer } from '../../../';
import { PLUGIN_ID, VIS_TELEMETRY_TASK, VIS_TELEMETRY_TASK_NUM_WORKERS } from '../../../constants';
import { visualizationsTaskRunner } from './visualizations/task_runner';

export function registerTasks(server: HapiServer) {
  const { taskManager } = server;

  taskManager.registerTaskDefinitions({
    [VIS_TELEMETRY_TASK]: {
      title: 'X-Pack telemetry calculator for Visualizations',
      type: VIS_TELEMETRY_TASK,
      numWorkers: VIS_TELEMETRY_TASK_NUM_WORKERS, // by default it's 100% their workers
      createTaskRunner({ taskInstance, kbnServer }: { kbnServer: any; taskInstance: any }) {
        return {
          run: visualizationsTaskRunner(taskInstance, kbnServer),
        };
      },
    },
  });
}

export function scheduleTasks(server: HapiServer) {
  const { taskManager } = server;
  const { kbnServer } = server.plugins.xpack_main.status.plugin;

  kbnServer.afterPluginsInit(() => {
    // The code block below can't await directly within "afterPluginsInit"
    // callback due to circular dependency. The server isn't "ready" until
    // this code block finishes. Migrations wait for server to be ready before
    // executing. Saved objects repository waits for migrations to finish before
    // finishing the request. To avoid this, we'll await within a separate
    // function block.
    (async () => {
      try {
        await taskManager.schedule({
          id: `${PLUGIN_ID}-${VIS_TELEMETRY_TASK}`,
          taskType: VIS_TELEMETRY_TASK,
          state: { stats: {}, runs: 0 },
        });
      } catch (e) {
        server.log(['warning', 'telemetry'], `Error scheduling task, received ${e.message}`);
      }
    })();
  });
}
