/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getAllStats } from './get_all_stats';
import { getStatsWithXpack } from '../../../xpack_main/server/telemetry_collection';
import {
  StatsGetter,
  getStatsGetterConfig,
} from '../../../../../../src/legacy/core_plugins/telemetry/server/collection_manager';

export const getStatsWithMonitoring: StatsGetter = async function(config) {
  let response = [];
  const { start, end, server, callCluster } = getStatsGetterConfig(config, 'monitoring');

  try {
    response = await getAllStats({ server, callCluster, start, end });
  } catch (err) {
    // no-op
  }

  if (!Array.isArray(response) || response.length === 0) {
    response = await getStatsWithXpack(config);
  }

  return response;
};
