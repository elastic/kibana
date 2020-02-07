/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createQuery } from './create_query';
import { INDEX_PATTERN_BEATS } from '../../common/constants';

const HITS_SIZE = 10000; // maximum hits to receive from ES with each search

const getBaseStats = () => ({
  // stats
  versions: {},
  types: {},
  outputs: {},
  count: 0,
  eventsPublished: 0,
  hosts: 0,
  // state
  input: {
    count: 0,
    names: [],
  },
  module: {
    count: 0,
    names: [],
  },
  architecture: {
    count: 0,
    architectures: [],
  },
});

/*
 * Update a clusters object with processed beat stats
 * @param {Array} results - array of Beats docs from ES
 * @param {Object} clusters - Beats stats in an object keyed by the cluster UUIDs
 * @param {Object} clusterHostSets - the object keyed by cluster UUIDs to count the unique hosts
 * @param {Object} clusterModuleSets - the object keyed by cluster UUIDs to count the unique modules
 */
export function processResults(
  results = [],
  { clusters, clusterHostSets, clusterInputSets, clusterModuleSets, clusterArchitectureMaps }
) {
  const currHits = get(results, 'hits.hits', []);
  currHits.forEach(hit => {
    const clusterUuid = get(hit, '_source.cluster_uuid');
    if (clusters[clusterUuid] === undefined) {
      clusters[clusterUuid] = getBaseStats();
      clusterHostSets[clusterUuid] = new Set();
      clusterInputSets[clusterUuid] = new Set();
      clusterModuleSets[clusterUuid] = new Set();
      clusterArchitectureMaps[clusterUuid] = new Map();
    }

    const processBeatsStatsResults = () => {
      const { versions, types, outputs } = clusters[clusterUuid];
      const thisVersion = get(hit, '_source.beats_stats.beat.version');
      if (thisVersion !== undefined) {
        const thisVersionAccum = versions[thisVersion] || 0;
        versions[thisVersion] = thisVersionAccum + 1;
      }

      const thisType = get(hit, '_source.beats_stats.beat.type');
      if (thisType !== undefined) {
        const thisTypeAccum = types[thisType] || 0;
        types[thisType] = thisTypeAccum + 1;
      }

      const thisOutput = get(hit, '_source.beats_stats.metrics.libbeat.output.type');
      if (thisOutput !== undefined) {
        const thisOutputAccum = outputs[thisOutput] || 0;
        outputs[thisOutput] = thisOutputAccum + 1;
      }

      const thisEvents = get(hit, '_source.beats_stats.metrics.libbeat.pipeline.events.published');
      if (thisEvents !== undefined) {
        clusters[clusterUuid].eventsPublished += thisEvents;
      }

      const thisHost = get(hit, '_source.beats_stats.beat.host');
      if (thisHost !== undefined) {
        const hostsMap = clusterHostSets[clusterUuid];
        hostsMap.add(thisHost);
        clusters[clusterUuid].hosts = hostsMap.size;
      }
    };

    const processBeatsStateResults = () => {
      const stateInput = get(hit, '_source.beats_state.state.input');
      if (stateInput !== undefined) {
        const inputSet = clusterInputSets[clusterUuid];
        stateInput.names.forEach(name => inputSet.add(name));
        clusters[clusterUuid].input.names = Array.from(inputSet);
        clusters[clusterUuid].input.count += stateInput.count;
      }

      const stateModule = get(hit, '_source.beats_state.state.module');
      const statsType = get(hit, '_source.beats_state.beat.type');
      if (stateModule !== undefined) {
        const moduleSet = clusterModuleSets[clusterUuid];
        stateModule.names.forEach(name => moduleSet.add(statsType + '.' + name));
        clusters[clusterUuid].module.names = Array.from(moduleSet);
        clusters[clusterUuid].module.count += stateModule.count;
      }

      const heartbeatState = get(hit, '_source.beats_state.state.heartbeat');
      if (heartbeatState !== undefined) {
        if (!clusters[clusterUuid].hasOwnProperty('heartbeat')) {
          clusters[clusterUuid].heartbeat = {
            monitors: 0,
            endpoints: 0,
          };
        }
        const clusterHb = clusters[clusterUuid].heartbeat;

        clusterHb.monitors += heartbeatState.monitors;
        clusterHb.endpoints += heartbeatState.endpoints;
        for (const proto in heartbeatState) {
          if (!heartbeatState.hasOwnProperty(proto)) {
            continue;
          }
          const val = heartbeatState[proto];
          if (typeof val !== 'object') {
            continue;
          }

          if (!clusterHb.hasOwnProperty(proto)) {
            clusterHb[proto] = {
              monitors: 0,
              endpoints: 0,
            };
          }
          clusterHb[proto].monitors += val.monitors;
          clusterHb[proto].endpoints += val.endpoints;
        }
      }

      const functionbeatState = get(hit, '_source.beats_state.state.functionbeat');
      if (functionbeatState !== undefined) {
        if (!clusters[clusterUuid].hasOwnProperty('functionbeat')) {
          clusters[clusterUuid].functionbeat = {
            functions: {
              count: 0,
            },
          };
        }

        clusters[clusterUuid].functionbeat.functions.count += get(
          functionbeatState,
          'functions.count',
          0
        );
      }

      const stateHost = get(hit, '_source.beats_state.state.host');
      if (stateHost !== undefined) {
        const hostMap = clusterArchitectureMaps[clusterUuid];
        const hostKey = `${stateHost.architecture}/${stateHost.os.platform}`;
        let os = hostMap.get(hostKey);

        if (!os) {
          // undefined if new
          os = { name: stateHost.os.platform, architecture: stateHost.architecture, count: 0 };
          hostMap.set(hostKey, os);
        }

        // total per os/arch
        os.count += 1;

        // overall total (which should be the same number as the sum of all os.count values)
        clusters[clusterUuid].architecture.count += 1;
        clusters[clusterUuid].architecture.architectures = Array.from(hostMap.values());
      }
    };

    if (get(hit, '_source.type') === 'beats_stats') {
      clusters[clusterUuid].count += 1;
      processBeatsStatsResults();
    } else {
      processBeatsStateResults();
    }
  });
}

/*
 * Create a set of result objects where each is the result of searching hits from Elasticsearch with a size of HITS_SIZE each time.
 * @param {Object} server - The server instance
 * @param {function} callCluster - The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids - The string Cluster UUIDs to fetch details for
 * @param {Date} start - Start time to limit the stats
 * @param {Date} end - End time to limit the stats
 * @param {Number} options.page - selection of hits to fetch from ES
 * @param {Object} options.clusters - Beats stats in an object keyed by the cluster UUIDs
 * @param {String} type - beats_stats or beats_state
 * @return {Promise}
 */
async function fetchBeatsByType(
  server,
  callCluster,
  clusterUuids,
  start,
  end,
  { page = 0, ...options } = {},
  type
) {
  const params = {
    index: INDEX_PATTERN_BEATS,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.type',
      'hits.hits._source.beats_stats.beat.version',
      'hits.hits._source.beats_stats.beat.type',
      'hits.hits._source.beats_stats.beat.host',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.published',
      'hits.hits._source.beats_stats.metrics.libbeat.output.type',
      'hits.hits._source.beats_state.state.input',
      'hits.hits._source.beats_state.state.module',
      'hits.hits._source.beats_state.state.host',
      'hits.hits._source.beats_state.state.heartbeat',
      'hits.hits._source.beats_state.beat.type',
    ],
    body: {
      query: createQuery({
        start,
        end,
        filters: [
          { terms: { cluster_uuid: clusterUuids } },
          {
            bool: {
              must_not: { term: { [`${type}.beat.type`]: 'apm-server' } },
              must: { term: { type: type } },
            },
          },
        ],
      }),
      from: page * HITS_SIZE,
      collapse: { field: `${type}.beat.uuid` },
      sort: [{ [`${type}.timestamp`]: 'desc' }],
      size: HITS_SIZE,
    },
  };

  const results = await callCluster('search', params);
  const hitsLength = get(results, 'hits.hits.length', 0);
  if (hitsLength > 0) {
    // further augment the clusters object with more stats
    processResults(results, options);

    if (hitsLength === HITS_SIZE) {
      // call recursively
      const nextOptions = {
        page: page + 1,
        ...options,
      };

      // returns a promise and keeps the caller blocked from returning until the entire clusters object is built
      return fetchBeatsByType(server, callCluster, clusterUuids, start, end, nextOptions, type);
    }
  }

  return Promise.resolve();
}

export async function fetchBeatsStats(...args) {
  return fetchBeatsByType(...args, 'beats_stats');
}

export async function fetchBeatsStates(...args) {
  return fetchBeatsByType(...args, 'beats_state');
}

/*
 * Call the function for fetching and summarizing beats stats
 * @return {Object} - Beats stats in an object keyed by the cluster UUIDs
 */
export async function getBeatsStats(server, callCluster, clusterUuids, start, end) {
  const options = {
    clusters: {}, // the result object to be built up
    clusterHostSets: {}, // passed to processResults for tracking state in the results generation
    clusterInputSets: {}, // passed to processResults for tracking state in the results generation
    clusterModuleSets: {}, // passed to processResults for tracking state in the results generation
    clusterArchitectureMaps: {}, // passed to processResults for tracking state in the results generation
  };

  await Promise.all([
    fetchBeatsStats(server, callCluster, clusterUuids, start, end, options),
    fetchBeatsStates(server, callCluster, clusterUuids, start, end, options),
  ]);

  return options.clusters;
}
