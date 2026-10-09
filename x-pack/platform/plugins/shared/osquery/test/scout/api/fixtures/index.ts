/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';
import {
  getOsqueryApiService,
  type OsqueryApiService,
} from '../../common/services/osquery_api_service';

export interface OsqueryApiServicesFixture extends ApiServicesFixture {
  osquery: OsqueryApiService;
}

export const apiTest = baseApiTest.extend<
  ScoutTestFixtures,
  { apiServices: OsqueryApiServicesFixture }
>({
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: ScoutWorkerFixtures['kbnClient'];
        log: ScoutWorkerFixtures['log'];
      },
      use: (extendedApiServices: OsqueryApiServicesFixture) => Promise<void>
    ) => {
      await use({
        ...apiServices,
        osquery: getOsqueryApiService({ kbnClient, log }),
      } as OsqueryApiServicesFixture);
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
