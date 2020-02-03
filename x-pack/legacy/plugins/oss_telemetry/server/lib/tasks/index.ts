/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger } from 'kibana/server';
import { PLUGIN_ID, VIS_TELEMETRY_TASK } from '../../../constants';
import { visualizationsTaskRunner } from './visualizations/task_runner';
import KbnServer from '../../../../../../../src/legacy/server/kbn_server';
import { LegacyConfig } from '../../plugin';
import {
  TaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '../../../../../../plugins/task_manager/server';

export function registerTasks({
  taskManager,
  logger,
  elasticsearch,
  config,
}: {
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
  elasticsearch: CoreSetup['elasticsearch'];
  config: LegacyConfig;
}) {
  if (!taskManager) {
    logger.debug('Task manager is not available');
    return;
  }

  taskManager.registerTaskDefinitions({
    [VIS_TELEMETRY_TASK]: {
      title: 'X-Pack telemetry calculator for Visualizations',
      type: VIS_TELEMETRY_TASK,
      createTaskRunner({ taskInstance }: { taskInstance: TaskInstance }) {
        return {
          run: visualizationsTaskRunner(taskInstance, config, elasticsearch),
        };
      },
    },
  });
}

export function scheduleTasks({
  taskManager,
  xpackMainStatus,
  logger,
}: {
  taskManager?: TaskManagerStartContract;
  xpackMainStatus: { kbnServer: KbnServer };
  logger: Logger;
}) {
  if (!taskManager) {
    logger.debug('Task manager is not available');
    return;
  }

  const { kbnServer } = xpackMainStatus;

  kbnServer.afterPluginsInit(() => {
    // The code block below can't await directly within "afterPluginsInit"
    // callback due to circular dependency. The server isn't "ready" until
    // this code block finishes. Migrations wait for server to be ready before
    // executing. Saved objects repository waits for migrations to finish before
    // finishing the request. To avoid this, we'll await within a separate
    // function block.
    (async () => {
      try {
        await taskManager.ensureScheduled({
          id: `${PLUGIN_ID}-${VIS_TELEMETRY_TASK}`,
          taskType: VIS_TELEMETRY_TASK,
          state: { stats: {}, runs: 0 },
          params: {},
        });
      } catch (e) {
        logger.debug(`Error scheduling task, received ${e.message}`);
      }
    })();
  });
}
