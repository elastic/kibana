/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createQuery } from './create_query';
import {
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_BEATS,
  INDEX_PATTERN_LOGSTASH,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  TELEMETRY_QUERY_SOURCE,
} from '../../common/constants';

/**
 * Update a counter associated with the {@code key}.
 *
 * @param {Map} map Map to update the counter for the {@code key}.
 * @param {String} key The key to increment a counter for.
 */
function incrementByKey(map, key) {
  if (!key) {
    return;
  }

  let count = map.get(key);

  if (!count) {
    count = 0;
  }

  map.set(key, count + 1);
}

/**
 * Help to reduce Cloud metrics into unidentifiable metrics (e.g., count IDs so that they can be dropped).
 *
 * @param  {Map} clouds Existing cloud data by cloud name.
 * @param  {Object} cloud Cloud object loaded from Elasticsearch data.
 */
function reduceCloudForCluster(cloudMap, cloud) {
  if (!cloud) {
    return;
  }

  let cloudByName = cloudMap.get(cloud.name);

  if (!cloudByName) {
    cloudByName = {
      count: 0,
      unique: new Set(),
      vm_type: new Map(),
      region: new Map(),
      zone: new Map(),
    };

    cloudMap.set(cloud.name, cloudByName);
  }

  // keep track of how many running instances there are
  cloudByName.count++;

  if (cloud.id) {
    cloudByName.unique.add(cloud.id);
  }

  incrementByKey(cloudByName.vm_type, cloud.vm_type);
  incrementByKey(cloudByName.region, cloud.region);
  incrementByKey(cloudByName.zone, cloud.zone);
}

/**
 * Group the instances (hits) by clusters.
 *
 * @param  {Array} instances Array of hits from the request containing the cluster UUID and version.
 * @param {String} product The product to limit too ('kibana', 'logstash', 'beats')
 * @return {Map} A map of the Cluster UUID to an {@link Object} containing the {@code count} and {@code versions} {@link Map}
 */
function groupInstancesByCluster(instances, product) {
  const clusterMap = new Map();

  // hits are sorted arbitrarily by product UUID
  instances.map(instance => {
    const clusterUuid = get(instance, '_source.cluster_uuid');
    const version = get(instance, `_source.${product}_stats.${product}.version`);
    const cloud = get(instance, `_source.${product}_stats.cloud`);
    const os = get(instance, `_source.${product}_stats.os`);

    if (clusterUuid) {
      let cluster = clusterMap.get(clusterUuid);

      if (!cluster) {
        cluster = {
          count: 0,
          versions: new Map(),
          cloudMap: new Map(),
          os: {
            platforms: new Map(),
            platformReleases: new Map(),
            distros: new Map(),
            distroReleases: new Map(),
          },
        };
        clusterMap.set(clusterUuid, cluster);
      }

      // keep track of how many instances there are
      cluster.count++;

      incrementByKey(cluster.versions, version);
      reduceCloudForCluster(cluster.cloudMap, cloud);

      if (os) {
        incrementByKey(cluster.os.platforms, os.platform);
        incrementByKey(cluster.os.platformReleases, os.platformRelease);
        incrementByKey(cluster.os.distros, os.distro);
        incrementByKey(cluster.os.distroReleases, os.distroRelease);
      }
    }
  });

  return clusterMap;
}

/**
 * Convert the {@code map} to an {@code Object} using the {@code keyName} as the key in the object. Per map entry:
 *
 * [
 *   { [keyName]: key1, count: value1 },
 *   { [keyName]: key2, count: value2 }
 * ]
 *
 * @param  {Map} map     [description]
 * @param  {String} keyName [description]
 * @return {Array}         [description]
 */
function mapToList(map, keyName) {
  const list = [];

  for (const [key, count] of map) {
    list.push({ [keyName]: key, count });
  }

  return list;
}

/**
 * Returns the right index pattern to find monitoring documents based on the product id
 *
 * @param {*} product The product id, which should be in the constants file
 */
function getIndexPatternForStackProduct(product) {
  switch (product) {
    case KIBANA_SYSTEM_ID:
      return INDEX_PATTERN_KIBANA;
    case BEATS_SYSTEM_ID:
    case APM_SYSTEM_ID:
      return INDEX_PATTERN_BEATS;
    case LOGSTASH_SYSTEM_ID:
      return INDEX_PATTERN_LOGSTASH;
  }
  return null;
}

/**
 * Get statistics about selected Elasticsearch clusters, for the selected {@code product}.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids The string Cluster UUIDs to fetch details for
 * @param {Date} start Start time to limit the stats
 * @param {Date} end End time to limit the stats
 * @param {String} product The product to limit too ('kibana', 'logstash', 'beats')
 * @return {Promise} Object keyed by the cluster UUIDs to make grouping easier.
 */
export function getHighLevelStats(server, callCluster, clusterUuids, start, end, product) {
  return fetchHighLevelStats(
    server,
    callCluster,
    clusterUuids,
    start,
    end,
    product
  ).then(response => handleHighLevelStatsResponse(response, product));
}

export async function fetchHighLevelStats(server, callCluster, clusterUuids, start, end, product) {
  const config = server.config();
  const isKibanaIndex = product === KIBANA_SYSTEM_ID;
  const filters = [{ terms: { cluster_uuid: clusterUuids } }];

  // we should supply this from a parameter in the future so that this remains generic
  if (isKibanaIndex) {
    const kibanaFilter = {
      bool: {
        should: [
          { exists: { field: 'kibana_stats.usage.index' } },
          {
            bool: {
              should: [
                { range: { 'kibana_stats.kibana.version': { lt: '6.7.2' } } },
                { term: { 'kibana_stats.kibana.version': '7.0.0' } },
              ],
            },
          },
        ],
      },
    };

    filters.push(kibanaFilter);
  }

  const params = {
    index: getIndexPatternForStackProduct(product),
    size: config.get('xpack.monitoring.max_bucket_size'),
    headers: {
      'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
    },
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.cluster_uuid',
      `hits.hits._source.${product}_stats.${product}.version`,
      `hits.hits._source.${product}_stats.os`,
      `hits.hits._source.${product}_stats.usage`,
      // we don't want metadata
      `hits.hits._source.${product}_stats.cloud.name`,
      `hits.hits._source.${product}_stats.cloud.id`,
      `hits.hits._source.${product}_stats.cloud.vm_type`,
      `hits.hits._source.${product}_stats.cloud.region`,
      `hits.hits._source.${product}_stats.cloud.zone`,
    ],
    body: {
      query: createQuery({
        start,
        end,
        type: `${product}_stats`,
        filters,
      }),
      collapse: {
        // a more ideal field would be the concatenation of the uuid + transport address for duped UUIDs (copied installations)
        field: `${product}_stats.${product}.uuid`,
      },
      sort: [{ timestamp: 'desc' }],
    },
  };

  return callCluster('search', params);
}

/**
 * Determine common, high-level details about the current product (e.g., Kibana) from the {@code response}.
 *
 * @param {Object} response The response from the aggregation
 * @param {String} product The product to limit too ('kibana', 'logstash', 'beats')
 * @return {Object} Object keyed by the cluster UUIDs to make grouping easier.
 */
export function handleHighLevelStatsResponse(response, product) {
  const instances = get(response, 'hits.hits', []);
  const clusterMap = groupInstancesByCluster(instances, product);

  const clusters = {};

  for (const [clusterUuid, cluster] of clusterMap) {
    // it's unlikely this will be an array of more than one, but it is one just incase
    const clouds = [];

    // remap the clouds (most likely singular or empty)
    for (const [name, cloud] of cluster.cloudMap) {
      clouds.push({
        name,
        count: cloud.count,
        vms: cloud.unique.size,
        regions: mapToList(cloud.region, 'region'),
        vm_types: mapToList(cloud.vm_type, 'vm_type'),
        zones: mapToList(cloud.zone, 'zone'),
      });
    }

    // map stats for product by cluster so that it can be joined with ES cluster stats
    clusters[clusterUuid] = {
      count: cluster.count,
      // remap the versions into something more digestable that won't blowup mappings:
      versions: mapToList(cluster.versions, 'version'),
      os: {
        platforms: mapToList(cluster.os.platforms, 'platform'),
        platformReleases: mapToList(cluster.os.platformReleases, 'platformRelease'),
        distros: mapToList(cluster.os.distros, 'distro'),
        distroReleases: mapToList(cluster.os.distroReleases, 'distroRelease'),
      },
      cloud: clouds.length > 0 ? clouds : undefined,
    };
  }

  return clusters;
}
