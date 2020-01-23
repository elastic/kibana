/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getXPack } from './get_xpack';
import { getLocalStats } from '../../../../../../src/legacy/core_plugins/telemetry/server/telemetry_collection';
import { StatsGetter } from '../../../../../../src/legacy/core_plugins/telemetry/server/collection_manager';

export const getStatsWithXpack: StatsGetter = async function(clustersDetails, config) {
  const { callCluster } = config;
  const clustersLocalStats = await getLocalStats(clustersDetails, config);
  const { license, xpack } = await getXPack(callCluster);

  return clustersLocalStats.map(localStats => {
    localStats.license = license;
    localStats.stack_stats.xpack = xpack;
    return localStats;
  });
};
