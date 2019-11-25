/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { PluginSetupContract as UsageCollection } from 'src/plugins/usage_collection/server';
import { KIBANA_CLOUD_STATS_TYPE } from './constants';

export interface UsageStats {
  isCloudEnabled: boolean;
}

export function createCollectorFetch(server: Server) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const { id } = server.config().get(`xpack.cloud`);

    return {
      isCloudEnabled: !!id,
    };
  };
}

export function createCloudUsageCollector(usageCollection: UsageCollection, server: Server) {
  return usageCollection.makeUsageCollector({
    type: KIBANA_CLOUD_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(server),
  });
}

export function registerCloudUsageCollector(usageCollection: UsageCollection, server: Server) {
  const collector = createCloudUsageCollector(usageCollection, server);
  usageCollection.registerCollector(collector);
}
