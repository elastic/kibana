/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set, merge } from 'lodash';

import { StatsGetter } from 'src/legacy/core_plugins/telemetry/server/collection_manager';
import { LOGSTASH_SYSTEM_ID, KIBANA_SYSTEM_ID, BEATS_SYSTEM_ID } from '../../common/constants';
import { getElasticsearchStats, ESClusterStats } from './get_es_stats';
import { getKibanaStats, KibanaStats } from './get_kibana_stats';
import { getBeatsStats } from './get_beats_stats';
import { getHighLevelStats } from './get_high_level_stats';

type PromiseReturnType<T extends (...args: any[]) => any> = ReturnType<T> extends Promise<infer R>
  ? R
  : T;

/**
 * Get statistics for all products joined by Elasticsearch cluster.
 * Returns the array of clusters joined with the Kibana and Logstash instances.
 *
 */
export const getAllStats: StatsGetter = async (
  clustersDetails,
  { server, callCluster, start, end }
) => {
  const clusterUuids = clustersDetails.map(clusterDetails => clusterDetails.clusterUuid);

  const [esClusters, kibana, logstash, beats] = await Promise.all([
    getElasticsearchStats(server, callCluster, clusterUuids), // cluster_stats, stack_stats.xpack, cluster_name/uuid, license, version
    getKibanaStats(server, callCluster, clusterUuids, start, end), // stack_stats.kibana
    getHighLevelStats(server, callCluster, clusterUuids, start, end, LOGSTASH_SYSTEM_ID), // stack_stats.logstash
    getBeatsStats(server, callCluster, clusterUuids, start, end), // stack_stats.beats
  ]);

  return handleAllStats(esClusters, { kibana, logstash, beats });
};

/**
 * Combine the statistics from the stack to create "cluster" stats that associate all products together based on the cluster
 * that is attached.
 *
 * @param {Array} clusters The Elasticsearch clusters
 * @param {Object} kibana The Kibana instances keyed by Cluster UUID
 * @param {Object} logstash The Logstash nodes keyed by Cluster UUID
 *
 * Returns the clusters joined with the Kibana and Logstash instances under each cluster's {@code stack_stats}.
 */
export function handleAllStats(
  clusters: ESClusterStats[],
  {
    kibana,
    logstash,
    beats,
  }: {
    kibana: KibanaStats;
    logstash: PromiseReturnType<typeof getHighLevelStats>;
    beats: PromiseReturnType<typeof getBeatsStats>;
  }
) {
  return clusters.map(cluster => {
    // if they are using Kibana or Logstash, then add it to the cluster details under cluster.stack_stats
    addStackStats(cluster, kibana, KIBANA_SYSTEM_ID);
    addStackStats(cluster, logstash, LOGSTASH_SYSTEM_ID);
    addStackStats(cluster, beats, BEATS_SYSTEM_ID);
    mergeXPackStats(cluster, kibana, 'graph_workspace', 'graph'); // copy graph_workspace info out of kibana, merge it into stack_stats.xpack.graph

    return cluster;
  });
}

/**
 * Add product data to the {@code cluster}, only if it exists for the current {@code cluster}.
 *
 * @param {Object} cluster The current Elasticsearch cluster stats
 * @param {Object} allProductStats Product stats, keyed by Cluster UUID
 * @param {String} product The product name being added (e.g., 'kibana' or 'logstash')
 */
export function addStackStats<T extends { [clusterUuid: string]: K }, K>(
  cluster: ESClusterStats & { stack_stats?: { [product: string]: K } },
  allProductStats: T,
  product: string
) {
  const productStats = allProductStats[cluster.cluster_uuid];

  // Don't add it if they're not using (or configured to report stats) this product for this cluster
  if (productStats) {
    if (!cluster.stack_stats) {
      cluster.stack_stats = {};
    }

    cluster.stack_stats[product] = productStats;
  }
}

export function mergeXPackStats<T extends { [clusterUuid: string]: unknown }>(
  cluster: ESClusterStats & { stack_stats?: { xpack?: { [product: string]: unknown } } },
  allProductStats: T,
  path: string,
  product: string
) {
  const productStats = get(allProductStats, cluster.cluster_uuid + '.' + path);

  if (productStats || productStats === 0) {
    if (!cluster.stack_stats) {
      cluster.stack_stats = {};
    }
    if (!cluster.stack_stats.xpack) {
      cluster.stack_stats.xpack = {};
    }

    const mergeStats = {};
    set(mergeStats, path, productStats);

    // merge existing data with new stats
    cluster.stack_stats.xpack[product] = cluster.stack_stats.xpack[product] || {};
    merge(cluster.stack_stats.xpack[product], mergeStats);
  }
}
