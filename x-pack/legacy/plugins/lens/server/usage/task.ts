/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server, SavedObjectsClient as SavedObjectsClientType } from 'src/legacy/server/kbn_server';
import { CoreSetup } from 'src/core/server';
import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
import { SearchParams, SearchResponse, DeleteDocumentByQueryResponse } from 'elasticsearch';
import { RunContext } from '../../../task_manager';

// This task is responsible for running daily and aggregating all the Lens click event objects
// into daily rolled-up documents, which will be used in reporting click stats

const TELEMETRY_TASK_TYPE = 'lens_telemetry';

export const TASK_ID = `Lens-${TELEMETRY_TASK_TYPE}`;

type ClusterSearchType = (
  endpoint: 'search',
  params: SearchParams & {
    rest_total_hits_as_int: boolean;
  },
  options?: CallClusterOptions
) => Promise<SearchResponse<unknown>>;
type ClusterDeleteType = (
  endpoint: 'deleteByQuery',
  params: SearchParams,
  options?: CallClusterOptions
) => Promise<DeleteDocumentByQueryResponse>;

export function initializeLensTelemetry(core: CoreSetup, { server }: { server: Server }) {
  registerLensTelemetryTask(core, { server });
  scheduleTasks(server);
}

function registerLensTelemetryTask(core: CoreSetup, { server }: { server: Server }) {
  const taskManager = server.plugins.task_manager!;
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Lens telemetry fetch task',
      type: TELEMETRY_TASK_TYPE,
      timeout: '1m',
      createTaskRunner: telemetryTaskRunner(server),
    },
  });
}

function scheduleTasks(server: Server) {
  const taskManager = server.plugins.task_manager;
  const { kbnServer } = server.plugins.xpack_main.status.plugin;

  kbnServer.afterPluginsInit(() => {
    // The code block below can't await directly within "afterPluginsInit"
    // callback due to circular dependency The server isn't "ready" until
    // this code block finishes. Migrations wait for server to be ready before
    // executing. Saved objects repository waits for migrations to finish before
    // finishing the request. To avoid this, we'll await within a separate
    // function block.
    (async () => {
      try {
        await taskManager.schedule({
          id: TASK_ID,
          taskType: TELEMETRY_TASK_TYPE,
          state: { stats: {}, runs: 0 },
          params: {},
        });
      } catch (e) {
        server.log(['warning', 'telemetry'], `Error scheduling task, received ${e.message}`);
      }
    })();
  });
}

async function doWork(server: Server, callCluster: ClusterSearchType & ClusterDeleteType) {
  const kibanaIndex = server.config().get<string>('kibana.index');

  const metrics = await callCluster('search', {
    index: kibanaIndex,
    rest_total_hits_as_int: true,
    body: {
      query: {
        bool: {
          filter: [
            { term: { type: 'lens-ui-telemetry' } },
            { range: { updated_at: { gte: 'now-90d/d' } } },
          ],
        },
      },
      aggs: {
        daily: {
          date_histogram: {
            field: 'updated_at',
            calendar_interval: '1d',
          },
          aggs: {
            names: {
              terms: { field: 'lens-ui-telemetry.name', size: 100 },
            },
          },
        },
      },
    },
    size: 0,
  });

  const byDateByType: Record<string, Record<string, number>> = {};

  metrics.aggregations.daily.buckets.forEach(bucket => {
    const byType: Record<string, number> = {};
    bucket.names.buckets.forEach(({ key, doc_count }) => {
      byType[key] = doc_count;
    });
    byDateByType[bucket.key] = byType;
  });

  if (metrics.hits.total > 0) {
    // After aggregating the lens telemetry, we delete the originals which are not needed
    await callCluster('deleteByQuery', {
      index: kibanaIndex,
      body: {
        query: {
          bool: {
            filter: [{ term: { type: 'lens-ui-telemetry' } }],
          },
        },
      },
    });
  }

  return byDateByType;
}

function telemetryTaskRunner(server: Server) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const prevState = state;

    const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;

    let lensTelemetryTask: Promise<unknown>;

    return {
      async run() {
        try {
          lensTelemetryTask = doWork(server, callCluster);
        } catch (err) {
          server.log(['warning'], `Error loading lens telemetry: ${err}`);
        }

        return lensTelemetryTask
          .then((lensTelemetry = {}) => {
            return {
              state: {
                runs: state.runs || 1,
                stats: lensTelemetry || prevState.stats || {},
              },
              runAt: getNextMidnight(),
            };
          })
          .catch(errMsg =>
            server.log(['warning'], `Error executing lens telemetry task: ${errMsg}`)
          );
      },
    };
  };
}

function getNextMidnight() {
  const nextMidnight = new Date();
  // nextMidnight.setHours(0, 0, 0, 0);
  nextMidnight.setHours(nextMidnight.getHours(), nextMidnight.getMinutes() + 1, 0, 0);
  // nextMidnight.setDate(nextMidnight.getDate() + 1);
  // return nextMidnight;
  return nextMidnight;
}
