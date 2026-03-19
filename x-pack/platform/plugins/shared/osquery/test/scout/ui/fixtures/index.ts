/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { ResponseActionsFormPage } from './page_objects';
import {
  getOsqueryApiService,
  type OsqueryApiService,
} from '../../common/services/osquery_api_service';

export interface OsqueryApiServicesFixture extends ApiServicesFixture {
  osquery: OsqueryApiService;
}

export interface OsqueryScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    responseActionsForm: ResponseActionsFormPage;
  };
}

export interface OsqueryScoutWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: OsqueryApiServicesFixture;
}

export const test = baseTest.extend<OsqueryScoutTestFixtures, OsqueryScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: OsqueryScoutTestFixtures['pageObjects'];
      page: OsqueryScoutTestFixtures['page'];
    },
    use: (pageObjects: OsqueryScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      responseActionsForm: createLazyPageObject(ResponseActionsFormPage, page),
    };

    await use(extendedPageObjects);
  },
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
      const extendedApiServices = apiServices as OsqueryApiServicesFixture;
      extendedApiServices.osquery = getOsqueryApiService({ kbnClient, log });
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
