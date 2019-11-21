/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { KIBANA_CLOUD_STATS_TYPE } from './constants';

export interface UsageStats {
  isCloudEnabled: boolean;
}

export interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
    };
  };
}

export function createCollectorFetch(server: any) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const { id } = server.config().get(`xpack.cloud`);

    return {
      isCloudEnabled: !!id,
    };
  };
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getCloudUsageCollector(server: KibanaHapiServer) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_CLOUD_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(server),
  });
}
