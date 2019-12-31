/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { CoreSetup } from 'src/core/server';
import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
import {
  SearchParams,
  DeleteDocumentByQueryParams,
  SearchResponse,
  DeleteDocumentByQueryResponse,
} from 'elasticsearch';
import { TaskManagerPluginStartContract } from '../../../../../plugins/kibana_task_manager/server';
import { ESSearchResponse } from '../../../apm/typings/elasticsearch';
import { XPackMainPlugin } from '../../../xpack_main/server/xpack_main';
import { RunContext, TaskManager } from '../../../task_manager/server';
import { getVisualizationCounts } from './visualization_counts';

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
  params: DeleteDocumentByQueryParams,
  options?: CallClusterOptions
) => Promise<DeleteDocumentByQueryResponse>;

export function initializeLensTelemetry(core: CoreSetup, server: Server) {
  registerLensTelemetryTask(core, server);
  scheduleTasks(server);
}

function registerLensTelemetryTask(core: CoreSetup, server: Server) {
  const taskManager = {
    ...server.newPlatform.setup.plugins.kibanaTaskManager,
    ...server.newPlatform.start.plugins.kibanaTaskManager,
  } as TaskManager;

  if (!taskManager) {
    server.log(['debug', 'telemetry'], `Task manager is not available`);
    return;
  }

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
  const taskManager = server.newPlatform.start.plugins
    .kibanaTaskManager as TaskManagerPluginStartContract;
  const { kbnServer } = (server.plugins.xpack_main as XPackMainPlugin & {
    status: { plugin: { kbnServer: KbnServer } };
  }).status.plugin;

  if (!taskManager) {
    server.log(['debug', 'telemetry'], `Task manager is not available`);
    return;
  }

  kbnServer.afterPluginsInit(() => {
    // The code block below can't await directly within "afterPluginsInit"
    // callback due to circular dependency The server isn't "ready" until
    // this code block finishes. Migrations wait for server to be ready before
    // executing. Saved objects repository waits for migrations to finish before
    // finishing the request. To avoid this, we'll await within a separate
    // function block.
    (async () => {
      try {
        await taskManager.ensureScheduled({
          id: TASK_ID,
          taskType: TELEMETRY_TASK_TYPE,
          state: { byDate: {}, suggestionsByDate: {}, saved: {}, runs: 0 },
          params: {},
        });
      } catch (e) {
        server.log(['debug', 'telemetry'], `Error scheduling task, received ${e.message}`);
      }
    })();
  });
}

export async function getDailyEvents(
  kibanaIndex: string,
  callCluster: ClusterSearchType & ClusterDeleteType
): Promise<{
  byDate: Record<string, Record<string, number>>;
  suggestionsByDate: Record<string, Record<string, number>>;
}> {
  const aggs = {
    daily: {
      date_histogram: {
        field: 'lens-ui-telemetry.date',
        calendar_interval: '1d',
        min_doc_count: 1,
      },
      aggs: {
        groups: {
          filters: {
            filters: {
              suggestionEvents: {
                bool: {
                  filter: {
                    term: { 'lens-ui-telemetry.type': 'suggestion' },
                  },
                },
              },
              regularEvents: {
                bool: {
                  must_not: {
                    term: { 'lens-ui-telemetry.type': 'suggestion' },
                  },
                },
              },
            },
          },
          aggs: {
            names: {
              terms: { field: 'lens-ui-telemetry.name', size: 100 },
              aggs: {
                sums: { sum: { field: 'lens-ui-telemetry.count' } },
              },
            },
          },
        },
      },
    },
  };

  const metrics: ESSearchResponse<
    unknown,
    {
      body: { aggs: typeof aggs };
    },
    { restTotalHitsAsInt: true }
  > = await callCluster('search', {
    index: kibanaIndex,
    rest_total_hits_as_int: true,
    body: {
      query: {
        bool: {
          filter: [
            { term: { type: 'lens-ui-telemetry' } },
            { range: { 'lens-ui-telemetry.date': { gte: 'now-90d/d' } } },
          ],
        },
      },
      aggs,
    },
    size: 0,
  });

  const byDateByType: Record<string, Record<string, number>> = {};
  const suggestionsByDate: Record<string, Record<string, number>> = {};

  metrics.aggregations!.daily.buckets.forEach(daily => {
    const byType: Record<string, number> = byDateByType[daily.key] || {};
    daily.groups.buckets.regularEvents.names.buckets.forEach(bucket => {
      byType[bucket.key] = (bucket.sums.value || 0) + (byType[daily.key] || 0);
    });
    byDateByType[daily.key] = byType;

    const suggestionsByType: Record<string, number> = suggestionsByDate[daily.key] || {};
    daily.groups.buckets.suggestionEvents.names.buckets.forEach(bucket => {
      suggestionsByType[bucket.key] =
        (bucket.sums.value || 0) + (suggestionsByType[daily.key] || 0);
    });
    suggestionsByDate[daily.key] = suggestionsByType;
  });

  // Always delete old date because we don't report it
  await callCluster('deleteByQuery', {
    index: kibanaIndex,
    waitForCompletion: true,
    body: {
      query: {
        bool: {
          filter: [
            { term: { type: 'lens-ui-telemetry' } },
            { range: { 'lens-ui-telemetry.date': { lt: 'now-90d/d' } } },
          ],
        },
      },
    },
  });

  return {
    byDate: byDateByType,
    suggestionsByDate,
  };
}

export function telemetryTaskRunner(server: Server) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;

    return {
      async run() {
        const kibanaIndex = server.config().get<string>('kibana.index');

        return Promise.all([
          getDailyEvents(kibanaIndex, callCluster),
          getVisualizationCounts(callCluster, server.config()),
        ])
          .then(([lensTelemetry, lensVisualizations]) => {
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
  return moment()
    .add(1, 'day')
    .startOf('day')
    .toDate();
}
