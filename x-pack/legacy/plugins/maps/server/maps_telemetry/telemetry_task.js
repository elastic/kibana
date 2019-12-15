/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMapsTelemetry } from './maps_telemetry';

const TELEMETRY_TASK_TYPE = 'maps_telemetry';

export const TASK_ID = `Maps-${TELEMETRY_TASK_TYPE}`;

export function scheduleTask(server) {
  const taskManager = server.plugins.task_manager;

  if (!taskManager) {
    server.log(['debug', 'telemetry'], `Task manager is not available`);
    return;
  }

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
        await taskManager.ensureScheduled({
          id: TASK_ID,
          taskType: TELEMETRY_TASK_TYPE,
          state: { stats: {}, runs: 0 },
        });
      } catch (e) {
        server.log(['warning', 'maps'], `Error scheduling telemetry task, received ${e.message}`);
      }
    })();
  });
}

export function registerMapsTelemetryTask(server) {
  const taskManager = server.plugins.task_manager;

  if (!taskManager) {
    server.log(['debug', 'telemetry'], `Task manager is not available`);
    return;
  }

  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Maps telemetry fetch task',
      type: TELEMETRY_TASK_TYPE,
      timeout: '1m',
      createTaskRunner: telemetryTaskRunner(server),
    },
  });
}

export function telemetryTaskRunner(server) {
  return ({ taskInstance }) => {
    const { state } = taskInstance;
    const prevState = state;

    const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;

    let mapsTelemetryTask;

    return {
      async run({ taskCanceled = false } = {}) {
        try {
          mapsTelemetryTask = makeCancelable(getMapsTelemetry(server, callCluster), taskCanceled);
        } catch (err) {
          server.log(['warning'], `Error loading maps telemetry: ${err}`);
        } finally {
          return mapsTelemetryTask.promise
            .then((mapsTelemetry = {}) => {
              return {
                state: {
                  runs: state.runs || 0 + 1,
                  stats: mapsTelemetry.attributes || prevState.stats || {},
                },
                runAt: getNextMidnight(),
              };
            })
            .catch(errMsg =>
              server.log(['warning'], `Error executing maps telemetry task: ${errMsg}`)
            );
        }
      },
      async cancel() {
        if (mapsTelemetryTask) {
          mapsTelemetryTask.cancel();
        } else {
          server.log(['warning'], `Can not cancel "mapsTelemetryTask", it has not been defined`);
        }
      },
    };
  };
}

function makeCancelable(promise, isCanceled) {
  const logMsg = 'Maps telemetry task has been cancelled';
  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then(val => (isCanceled ? reject(logMsg) : resolve(val)))
      .catch(err => (isCanceled ? reject(logMsg) : reject(err.message)));
  });

  return {
    promise: wrappedPromise,
    cancel() {
      isCanceled = true;
    },
  };
}

function getNextMidnight() {
  const nextMidnight = new Date();
  nextMidnight.setHours(0, 0, 0, 0);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  return nextMidnight;
}
