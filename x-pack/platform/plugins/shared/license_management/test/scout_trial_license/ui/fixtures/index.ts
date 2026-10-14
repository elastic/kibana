/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { LicenseManagementPage } from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    licenseManagement: LicenseManagementPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutPage },
    use
  ) => {
    await use({
      ...pageObjects,
      licenseManagement: createLazyPageObject(LicenseManagementPage, page),
    } as ExtScoutTestFixtures['pageObjects']);
  },
});
