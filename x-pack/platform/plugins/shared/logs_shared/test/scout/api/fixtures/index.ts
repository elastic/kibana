/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';
import {
  getLogsSharedApiService,
  type LogsSharedApiService,
} from '../services/logs_shared_api_service';

declare module '@kbn/scout' {
  interface ApiServicesFixture {
    logsShared: LogsSharedApiService;
  }
}

export const apiTest = baseApiTest.extend<{}, { apiServices: ApiServicesFixture }>({
  apiServices: [
    async ({ apiServices, esClient, kbnClient, log }, use) => {
      await use(
        Object.assign(apiServices, {
          logsShared: getLogsSharedApiService({ esClient, kbnClient, log }),
        })
      );
    },
    { scope: 'worker' },
  ],
});
