/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getXPack } from './get_xpack';
import { getLocalStats } from '../../../../../../src/legacy/core_plugins/telemetry/server/telemetry_collection';
import {
  StatsGetter,
  getStatsCollectionConfig,
} from '../../../../../../src/legacy/core_plugins/telemetry/server/collection_manager';

export const getStatsWithXpack: StatsGetter = async function(config) {
  const { server, callCluster } = getStatsCollectionConfig(config, 'data');

  const localStats = await getLocalStats({ server, callCluster });
  const { license, xpack } = await getXPack(callCluster);

  localStats.license = license;
  localStats.stack_stats.xpack = xpack;

  return [localStats];
};
