/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout/src/common';
import { measurePerformanceAsync } from '@kbn/scout/src/common';

export interface StreamsTestApiService {
  enable: () => Promise<void>;
}

export function getStreamsTestApiService({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): StreamsTestApiService {
  return {
    async enable() {
      await measurePerformanceAsync(log, 'streamsTestApi.enable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/api/streams/_enable',
        });
      });
    },
  };
}
