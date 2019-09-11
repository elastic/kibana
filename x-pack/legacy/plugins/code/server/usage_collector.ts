/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '../';
import { APP_USAGE_TYPE } from '../common/constants';

export async function fetchCodeUsageMetrics(callCluster: any, server: ServerFacade) {
  // TODO: add more metrics in here.
  return {
    enabled: 1,
  };
}

export function initCodeUsageCollector(server: ServerFacade) {
  const upgradeAssistantUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: APP_USAGE_TYPE,
    isReady: () => true,
    fetch: async (callCluster: any) => fetchCodeUsageMetrics(callCluster, server),
  });

  server.usage.collectorSet.register(upgradeAssistantUsageCollector);
}
