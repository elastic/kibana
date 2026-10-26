/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import { ServiceAccountsPage } from './service_accounts_page';

interface ServiceAccountsFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    serviceAccounts: ServiceAccountsPage;
  };
}

export const test = baseTest.extend<ServiceAccountsFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ServiceAccountsFixtures['pageObjects'];
      page: ServiceAccountsFixtures['page'];
    },
    use: (pageObjects: ServiceAccountsFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({ ...pageObjects, serviceAccounts: new ServiceAccountsPage(page) });
  },
});
