/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Server } from 'src/legacy/server/kbn_server';
import { CoreSetup } from 'src/core/server';
import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
import { SearchParams, SearchResponse, DeleteDocumentByQueryResponse } from 'elasticsearch';
import { RunContext, ConcreteTaskInstance } from '../../../task_manager';
import { getVisualizationCounts } from './visualization_counts';
import { LensUsage } from './types';

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
          state: { byDate: {}, suggestionsByDate: {}, saved: {}, runs: 0 },
          params: {},
        });
      } catch (e) {
        server.log(['warning', 'telemetry'], `Error scheduling task, received ${e.message}`);
      }
    })();
  });
}

// type LensTaskState = LensUsage | {};

export async function doWork(
  prevState: any,
  server: Server,
  callCluster: ClusterSearchType & ClusterDeleteType
) {
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
            groups: {
              filters: {
                filters: {
                  suggestionEvent: {
                    bool: { filter: { term: { 'lens-ui-telemetry.type': 'suggestion' } } },
                  },
                  regularEvents: {
                    bool: { must_not: { term: { 'lens-ui-telemetry.type': 'suggestion' } } },
                  },
                },
              },
              aggs: {
                names: {
                  terms: { field: 'lens-ui-telemetry.name', size: 100 },
                },
              },
            },
          },
        },
      },
    },
    size: 0,
  });

  const byDateByType: Record<string, Record<string, number>> = prevState.byDate || {};
  const suggestionsByDate: Record<string, Record<string, number>> =
    prevState.suggestionsByDate || {};

  Object.keys(byDateByType).forEach(key => {
    // Unix time
    if (moment(key, 'x').isBefore(moment().subtract(30, 'days'))) {
      // Remove this key
      delete byDateByType[key];
      return;
    }
  });

  Object.keys(suggestionsByDate).forEach(key => {
    // Unix time
    if (moment(key, 'x').isBefore(moment().subtract(30, 'days'))) {
      // Remove this key
      delete suggestionsByDate[key];
      return;
    }
  });

  metrics.aggregations.daily.buckets.forEach(daily => {
    const byType: Record<string, number> = byDateByType[daily.key] || {};
    daily.groups.buckets.regularEvents.names.buckets.forEach(({ key, doc_count }) => {
      byType[key] = doc_count + (byType[daily.key] || 0);
    });
    byDateByType[daily.key] = byType;

    const suggestionsByType: Record<string, number> = suggestionsByDate[daily.key] || {};
    daily.groups.buckets.suggestionEvent.names.buckets.forEach(({ key, doc_count }) => {
      suggestionsByType[key] = doc_count + (byType[daily.key] || 0);
    });
    suggestionsByDate[daily.key] = suggestionsByType;
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

  return {
    byDate: byDateByType,
    suggestionsByDate,
  };
}

function telemetryTaskRunner(server: Server) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const prevState = state;

    const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;

    let lensTelemetryTask: Promise<unknown>;
    let lensVisualizationTask: ReturnType<typeof getVisualizationCounts>;

    return {
      async run() {
        try {
          lensTelemetryTask = doWork(prevState, server, callCluster);

          lensVisualizationTask = getVisualizationCounts(callCluster, server.config());
        } catch (err) {
          server.log(['warning'], `Error loading lens telemetry: ${err}`);
        }

        return Promise.all([lensTelemetryTask, lensVisualizationTask])
          .then(([lensTelemetry, lensVisualizations]) => {
            console.log({
              runs: (state.runs || 0) + 1,
              byDate: (lensTelemetry && lensTelemetry.byDate) || {},
              suggestionsByDate: (lensTelemetry && lensTelemetry.suggestionsByDate) || {},
              saved: lensVisualizations,
            });
            return {
              state: {
                runs: (state.runs || 0) + 1,
                byDate: (lensTelemetry && lensTelemetry.byDate) || {},
                suggestionsByDate: (lensTelemetry && lensTelemetry.suggestionsByDate) || {},
                saved: lensVisualizations,
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
