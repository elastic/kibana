/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Server, KibanaConfig } from 'src/legacy/server/kbn_server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { CoreSetup, SavedObjectsLegacyService } from 'src/core/server';
import { LensUsage } from './types';

export function registerLensUsageCollector(
  core: CoreSetup,
  plugins: {
    savedObjects: SavedObjectsLegacyService;
    usage: {
      collectorSet: {
        makeUsageCollector: (options: unknown) => unknown;
        register: (options: unknown) => unknown;
      };
    };
    config: KibanaConfig;
    server: Server;
  }
) {
  let isCollectorReady = false;
  async function determineIfTaskManagerIsReady() {
    let isReady = false;
    try {
      isReady = await isTaskManagerReady(plugins.server);
    } catch (err) {} // eslint-disable-line

    if (isReady) {
      isCollectorReady = true;
    } else {
      setTimeout(determineIfTaskManagerIsReady, 500);
    }
  }
  determineIfTaskManagerIsReady();

  const lensUsageCollector = plugins.usage.collectorSet.makeUsageCollector({
    type: 'lens',
    fetch: async (callCluster: CallCluster): Promise<LensUsage> => {
      try {
        const docs = await fetch(plugins.server);
        // get the accumulated state from the recurring task
        return get(docs, '[0].state.stats');
        // return getVisualizationCounts(callCluster, plugins.config);
      } catch (err) {
        return {
          saved_total: 0,
          saved_last_30_days: 0,
          saved_last_90_days: 0,
          visualization_types_overall: {},
          visualization_types_last_30_days: {},
          visualization_types_last_90_days: {},

          clicks_last_30_days: {},
          clicks_last_90_days: {},
          suggestion_clicks_last_30_days: {},
          suggestion_clicks_last_90_days: {},
        };
      }
    },
    isReady: () => isCollectorReady,
  });
  plugins.usage.collectorSet.register(lensUsageCollector);
}

async function isTaskManagerReady(server: Server) {
  const result = await fetch(server);
  return result !== null;
}

async function fetch(server: Server) {
  const taskManager = server.plugins.task_manager!;

  let docs;
  try {
    ({ docs } = await taskManager.fetch({
      query: { bool: { filter: { term: { _id: `task:Lens-lens_telemetry` } } } },
    }));
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (errMessage.includes('NotInitialized')) {
      docs = null;
    } else {
      throw err;
    }
  }

  return docs;
}
