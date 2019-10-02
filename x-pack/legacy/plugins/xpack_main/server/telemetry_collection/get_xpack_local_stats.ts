/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLocalStats } from '../../../../../../src/legacy/core_plugins/telemetry/server/collectors';

import { getXPackLicense } from './get_license_info';
import { getXPackUsage } from './get_xpack_usage';

export async function getXpackLocalStats(req: any, { useInternalUser = false } = {}) {
  const { server } = req;
  const { callWithRequest, callWithInternalUser } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = useInternalUser
    ? callWithInternalUser
    : (...args: any[]) => callWithRequest(req, ...args);

  const localStats = await getLocalStats(req, { useInternalUser });
  const xpackStats = await getXPackUsage(callCluster);
  const licenseInfo = await getXPackLicense(callCluster);

  localStats.license = licenseInfo;
  localStats.stack_stats.xpack = xpackStats;

  return localStats;
}
