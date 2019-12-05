/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { TASK_ID, scheduleTask, registerMapsTelemetryTask } from './telemetry_task';

export function initTelemetryCollection(usageCollection, server) {
  registerMapsTelemetryTask(server);
  scheduleTask(server);
  registerMapsUsageCollector(usageCollection, server);
}

async function isTaskManagerReady(server) {
  const result = await fetch(server);
  return result !== null;
}

async function fetch(server) {
  let docs;
  const taskManager = server.plugins.task_manager;

  if (!taskManager) {
    return null;
  }

  try {
    ({ docs } = await taskManager.fetch({
      query: {
        bool: {
          filter: {
            term: {
              _id: `task:${TASK_ID}`
            }
          }
        }
      }
    }));
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
    * The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the task manager
    * has to wait for all plugins to initialize first.
    * It's fine to ignore it as next time around it will be initialized (or it will throw a different type of error)
    */
    if (errMessage.indexOf('NotInitialized') >= 0) {
      return null;
    } else {
      throw err;
    }
  }

  return docs;
}

export function buildCollectorObj(server) {
  let isCollectorReady = false;
  async function determineIfTaskManagerIsReady() {
    let isReady = false;
    try {
      isReady = await isTaskManagerReady(server);
    } catch (err) {} // eslint-disable-line

    if (isReady) {
      isCollectorReady = true;
    } else {
      setTimeout(determineIfTaskManagerIsReady, 500);
    }
  }
  determineIfTaskManagerIsReady();

  return {
    type: 'maps',
    isReady: () => isCollectorReady,
    fetch: async () => {
      const docs = await fetch(server);
      return _.get(docs, '[0].state.stats');
    },
  };
}

export function registerMapsUsageCollector(usageCollection, server) {
  const collectorObj = buildCollectorObj(server);
  const mapsUsageCollector = usageCollection.makeUsageCollector(collectorObj);
  usageCollection.registerCollector(mapsUsageCollector);
}
