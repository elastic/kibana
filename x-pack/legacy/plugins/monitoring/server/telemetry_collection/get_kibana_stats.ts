/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { isEmpty } from 'lodash';
import { StatsCollectionConfig } from 'src/legacy/core_plugins/telemetry/server/collection_manager';
import { SearchResponse } from 'elasticsearch';
import { KIBANA_SYSTEM_ID, TELEMETRY_COLLECTION_INTERVAL } from '../../common/constants';
import {
  fetchHighLevelStats,
  handleHighLevelStatsResponse,
  ClustersHighLevelStats,
  ClusterHighLevelStats,
} from './get_high_level_stats';

export function rollUpTotals(
  rolledUp: ClusterUsageStats,
  addOn: { [key: string]: { total?: number } | undefined },
  field: Exclude<keyof ClusterUsageStats, 'plugins' | 'indices'>
) {
  const rolledUpTotal = rolledUp[field]?.total || 0;
  const addOnTotal = addOn[field]?.total || 0;
  return { total: rolledUpTotal + addOnTotal };
}
export function rollUpIndices(rolledUp: ClusterUsageStats) {
  return rolledUp.indices + 1;
}

export interface KibanaUsageStats {
  cluster_uuid: string;
  kibana_stats?: {
    usage?: {
      index?: string;
    } & {
      [plugin: string]: {
        total: number;
      };
    };
  };
}

export interface ClusterUsageStats {
  dashboard?: { total: number };
  visualization?: { total: number };
  search?: { total: number };
  index_pattern?: { total: number };
  graph_workspace?: { total: number };
  timelion_sheet?: { total: number };
  indices: number;
  plugins?: {
    xpack?: unknown;
    [plugin: string]: unknown;
  };
}

export interface ClustersUsageStats {
  [clusterUuid: string]: ClusterUsageStats | undefined;
}

export interface KibanaClusterStat extends Partial<ClusterUsageStats>, ClusterHighLevelStats {}

export interface KibanaStats {
  [clusterUuid: string]: KibanaClusterStat;
}

/*
 * @param {Object} rawStats
 */
export function getUsageStats(rawStats: SearchResponse<KibanaUsageStats>) {
  const clusterIndexCache = new Set();
  const rawStatsHits = rawStats.hits?.hits || [];

  // get usage stats per cluster / .kibana index
  return rawStatsHits.reduce((accum, currInstance) => {
    const clusterUuid = currInstance._source.cluster_uuid;
    const currUsage = currInstance._source.kibana_stats?.usage || {};
    const clusterIndexCombination = clusterUuid + currUsage.index;

    // return early if usage data is empty or if this cluster/index has already been processed
    if (isEmpty(currUsage) || clusterIndexCache.has(clusterIndexCombination)) {
      return accum;
    }
    clusterIndexCache.add(clusterIndexCombination);

    // Get the stats that were read from any number of different .kibana indices in the cluster,
    // roll them up into cluster-wide totals
    const rolledUpStats = accum[clusterUuid] || { indices: 0 };
    const stats = {
      dashboard: rollUpTotals(rolledUpStats, currUsage, 'dashboard'),
      visualization: rollUpTotals(rolledUpStats, currUsage, 'visualization'),
      search: rollUpTotals(rolledUpStats, currUsage, 'search'),
      index_pattern: rollUpTotals(rolledUpStats, currUsage, 'index_pattern'),
      graph_workspace: rollUpTotals(rolledUpStats, currUsage, 'graph_workspace'),
      timelion_sheet: rollUpTotals(rolledUpStats, currUsage, 'timelion_sheet'),
      indices: rollUpIndices(rolledUpStats),
    };

    // Get the stats provided by telemetry collectors.
    const {
      index,
      dashboard,
      visualization,
      search,
      index_pattern,
      graph_workspace,
      timelion_sheet,
      xpack,
      ...pluginsTop
    } = currUsage;

    // Stats filtered by telemetry collectors need to be flattened since they're pulled in a generic way.
    // A plugin might not provide flat stats if it implements formatForBulkUpload in its collector.
    // e.g: we want `xpack.reporting` to just be `reporting`
    const plugins = { ...pluginsTop, ...xpack };

    return {
      ...accum,
      [clusterUuid]: {
        ...stats,
        plugins,
      },
    };
  }, {} as ClustersUsageStats);
}

export function combineStats(
  highLevelStats: ClustersHighLevelStats,
  usageStats: ClustersUsageStats = {}
) {
  return Object.keys(highLevelStats).reduce((accum, currClusterUuid) => {
    return {
      ...accum,
      [currClusterUuid]: {
        ...highLevelStats[currClusterUuid],
        ...usageStats[currClusterUuid],
      },
    };
  }, {} as KibanaStats);
}

/**
 * Ensure the start and end dates are, at least, TELEMETRY_COLLECTION_INTERVAL apart
 * because, otherwise, we are sending telemetry with empty Kibana usage data.
 *
 * @param {date} [start] The start time from which to get the telemetry data
 * @param {date} [end] The end time from which to get the telemetry data
 */
export function ensureTimeSpan(
  start?: StatsCollectionConfig['start'],
  end?: StatsCollectionConfig['end']
) {
  // We only care if we have a start date, because that's the limit that might make us lose the document
  if (start) {
    const duration = moment.duration(TELEMETRY_COLLECTION_INTERVAL, 'milliseconds');
    // If end exists, we need to ensure they are, at least, TELEMETRY_COLLECTION_INTERVAL apart.
    // Otherwise start should be, at least, TELEMETRY_COLLECTION_INTERVAL apart from now
    let safeStart = moment().subtract(duration);
    if (end) {
      safeStart = moment(end).subtract(duration);
    }
    if (safeStart.isBefore(start)) {
      return { start: safeStart.toISOString(), end };
    }
  }
  return { start, end };
}

/*
 * Monkey-patch the modules from get_high_level_stats and add in the
 * specialized usage data that comes with kibana stats (kibana_stats.usage).
 */
export async function getKibanaStats(
  server: StatsCollectionConfig['server'],
  callCluster: StatsCollectionConfig['callCluster'],
  clusterUuids: string[],
  start: StatsCollectionConfig['start'],
  end: StatsCollectionConfig['end']
) {
  const { start: safeStart, end: safeEnd } = ensureTimeSpan(start, end);
  const rawStats = await fetchHighLevelStats<KibanaUsageStats>(
    server,
    callCluster,
    clusterUuids,
    safeStart,
    safeEnd,
    KIBANA_SYSTEM_ID
  );
  const highLevelStats = handleHighLevelStatsResponse(rawStats, KIBANA_SYSTEM_ID);
  const usageStats = getUsageStats(rawStats);
  const stats = combineStats(highLevelStats, usageStats);

  return stats;
}
