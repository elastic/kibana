/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getXPack } from './get_xpack';
import { getLocalStats } from '../../../../../../src/legacy/core_plugins/telemetry/server/telemetry_collection';

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
export async function getStatsWithXpack(
  req: any,
  config: any,
  start: string,
  end: string,
  unencrypted: boolean
) {
  const useInternalUser = !unencrypted;
  const { server } = req;
  const { callWithRequest, callWithInternalUser } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = useInternalUser
    ? callWithInternalUser
    : (...args: any[]) => callWithRequest(req, ...args);

  const localStats = await getLocalStats(req, { useInternalUser });
  const { license, xpack } = await getXPack(callCluster);

  localStats.license = license;
  localStats.stack_stats.xpack = xpack;

  return [localStats];
}
