/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getAllStats } from './get_all_stats';
import { getStatsWithXpack } from '../../../xpack_main/server/telemetry_collection';

/**
 * Get the telemetry data.
 *
 * @param {Object} req The incoming request.
 * @param {Object} config Kibana config.
 * @param {String} start The start time of the request (likely 20m ago).
 * @param {String} end The end time of the request.
 * @param {Boolean} unencrypted Is the request payload going to be unencrypted.
 * @return {Promise} An array of telemetry objects.
 */
export async function getStatsWithMonitoring(
  req: any,
  config: any,
  start: string,
  end: string,
  unencrypted: boolean
) {
  let response = [];
  const useInternalUser = !unencrypted;

  try {
    // attempt to collect stats from multiple clusters in monitoring data
    response = await getAllStats(req, start, end, { useInternalUser });
  } catch (err) {
    // no-op
  }

  if (!Array.isArray(response) || response.length === 0) {
    response = await getStatsWithXpack(req, config, start, end, unencrypted);
  }

  return response;
}
