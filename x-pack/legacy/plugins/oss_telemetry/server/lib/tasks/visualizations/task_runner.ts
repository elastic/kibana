/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _, { countBy, groupBy, mapValues } from 'lodash';
import {
  ESQueryResponse,
  HapiServer,
  SavedObjectDoc,
  TaskInstance,
  VisState,
  Visualization,
} from '../../../../';
import { getNextMidnight } from '../../get_next_midnight';

interface VisSummary {
  type: string;
  space: string;
}

/*
 * Parse the response data into telemetry payload
 */
async function getStats(callCluster: (method: string, params: any) => Promise<any>, index: string) {
  const searchParams = {
    size: 10000, // elasticsearch index.max_result_window default value
    index,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._id', 'hits.hits._source.visualization'],
    body: {
      query: {
        bool: { filter: { term: { type: 'visualization' } } },
      },
    },
  };
  const esResponse: ESQueryResponse = await callCluster('search', searchParams);
  const size = _.get(esResponse, 'hits.hits.length');
  if (size < 1) {
    return;
  }

  // `map` to get the raw types
  const visSummaries: VisSummary[] = esResponse.hits.hits.map((hit: SavedObjectDoc) => {
    const spacePhrases: string[] = hit._id.split(':');
    const space = spacePhrases.length === 3 ? spacePhrases[0] : 'default'; // if in a custom space, the format of a saved object ID is space:type:id
    const visualization: Visualization = _.get(hit, '_source.visualization', { visState: '{}' });
    const visState: VisState = JSON.parse(visualization.visState);

    return {
      type: visState.type || '_na_',
      space,
    };
  });

  // organize stats per type
  const visTypes = groupBy(visSummaries, 'type');

  // get the final result
  return mapValues(visTypes, curr => {
    const total = curr.length;
    const spacesBreakdown = countBy(curr, 'space');
    const spaceCounts: number[] = _.values(spacesBreakdown);

    return {
      total,
      spaces_min: _.min(spaceCounts),
      spaces_max: _.max(spaceCounts),
      spaces_avg: total / spaceCounts.length,
    };
  });
}

export function visualizationsTaskRunner(
  taskInstance: TaskInstance,
  kbnServer: { server: HapiServer }
) {
  const { server } = kbnServer;
  const { callWithInternalUser: callCluster } = server.plugins.elasticsearch.getCluster('data');
  const config = server.config();
  const index = config.get('kibana.index').toString(); // cast to string for TypeScript

  return async () => {
    let stats;
    let error;

    try {
      stats = await getStats(callCluster, index);
    } catch (err) {
      if (err.constructor === Error) {
        error = err.message;
      } else {
        error = err;
      }
    }

    return {
      runAt: getNextMidnight(),
      state: {
        runs: taskInstance.state.runs + 1,
        stats,
      },
      error,
    };
  };
}
