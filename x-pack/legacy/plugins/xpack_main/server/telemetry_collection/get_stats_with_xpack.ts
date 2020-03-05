/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StatsGetter } from '../../../../../../src/legacy/core_plugins/telemetry/server/collection_manager';
import {
  getLocalStats,
  TelemetryLocalStats,
} from '../../../../../../src/legacy/core_plugins/telemetry/server/telemetry_collection/get_local_stats';
import { getXPackUsage } from './get_xpack';

export type TelemetryAggregatedStats = TelemetryLocalStats & {
  stack_stats: { xpack?: object };
};

export const getStatsWithXpack: StatsGetter<TelemetryAggregatedStats> = async function(
  clustersDetails,
  config
) {
  const { callCluster } = config;
  const clustersLocalStats = await getLocalStats(clustersDetails, config);
  const xpack = await getXPackUsage(callCluster).catch(() => undefined); // We want to still report something (and do not lose the license) even when this method fails.

  return clustersLocalStats.map(localStats => {
    if (xpack) {
      return {
        ...localStats,
        stack_stats: { ...localStats.stack_stats, xpack },
      };
    }

    return localStats;
  });
};
