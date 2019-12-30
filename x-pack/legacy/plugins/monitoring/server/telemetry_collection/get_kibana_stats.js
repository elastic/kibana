/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty, omit } from 'lodash';
import { KIBANA_SYSTEM_ID } from '../../common/constants';
import { fetchHighLevelStats, handleHighLevelStatsResponse } from './get_high_level_stats';

export function rollUpTotals(rolledUp, addOn, field) {
  const rolledUpTotal = get(rolledUp, [field, 'total'], 0);
  const addOnTotal = get(addOn, [field, 'total'], 0);
  return { total: rolledUpTotal + addOnTotal };
}
export function rollUpIndices(rolledUp) {
  return rolledUp.indices + 1;
}

/*
 * @param {Object} rawStats
 */
export function getUsageStats(rawStats) {
  const clusterIndexCache = new Set();
  const rawStatsHits = get(rawStats, 'hits.hits', []);

  // get usage stats per cluster / .kibana index
  return rawStatsHits.reduce((accum, currInstance) => {
    const clusterUuid = get(currInstance, '_source.cluster_uuid');
    const currUsage = get(currInstance, '_source.kibana_stats.usage', {});
    const clusterIndexCombination = clusterUuid + currUsage.index;

    // return early if usage data is empty or if this cluster/index has already been processed
    if (isEmpty(currUsage) || clusterIndexCache.has(clusterIndexCombination)) {
      return accum;
    }
    clusterIndexCache.add(clusterIndexCombination);

    // Get the stats that were read from any number of different .kibana indices in the cluster,
    // roll them up into cluster-wide totals
    const rolledUpStats = get(accum, clusterUuid, { indices: 0 });
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
    const pluginsNested = omit(currUsage, [
      'index',
      'dashboard',
      'visualization',
      'search',
      'index_pattern',
      'graph_workspace',
      'timelion_sheet',
    ]);

    // Stats filtered by telemetry collectors need to be flattened since they're pulled in a generic way.
    // A plugin might not provide flat stats if it implements formatForBulkUpload in its collector.
    // e.g: we want `xpack.reporting` to just be `reporting`
    const top = omit(pluginsNested, 'xpack');
    const plugins = { ...top, ...pluginsNested.xpack };

    return {
      ...accum,
      [clusterUuid]: {
        ...stats,
        plugins,
      },
    };
  }, {});
}

export function combineStats(highLevelStats, usageStats = {}) {
  return Object.keys(highLevelStats).reduce((accum, currClusterUuid) => {
    return {
      ...accum,
      [currClusterUuid]: {
        ...highLevelStats[currClusterUuid],
        ...usageStats[currClusterUuid],
      },
    };
  }, {});
}

/*
 * Monkey-patch the modules from get_high_level_stats and add in the
 * specialized usage data that comes with kibana stats (kibana_stats.usage).
 */
export async function getKibanaStats(server, callCluster, clusterUuids, start, end) {
  const rawStats = await fetchHighLevelStats(
    server,
    callCluster,
    clusterUuids,
    start,
    end,
    KIBANA_SYSTEM_ID
  );
  const highLevelStats = handleHighLevelStatsResponse(rawStats, KIBANA_SYSTEM_ID);
  const usageStats = getUsageStats(rawStats);
  const stats = combineStats(highLevelStats, usageStats);

  return stats;
}
