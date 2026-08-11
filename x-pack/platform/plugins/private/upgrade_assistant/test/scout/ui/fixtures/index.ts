/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type {
  BrowserAuthFixture,
  PageObjects,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';

import * as testData from './constants';
import type { UpgradeAssistantPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface UpgradeAssistantBrowserAuthFixture extends BrowserAuthFixture {
  loginAsSuperuser: () => Promise<void>;
  loginAsKibanaAdmin: () => Promise<void>;
  loginAsGlobalDashboardReadWithUpgradeAssistant: () => Promise<void>;
}

export interface UpgradeAssistantTestFixtures extends ScoutTestFixtures {
  browserAuth: UpgradeAssistantBrowserAuthFixture;
  pageObjects: UpgradeAssistantPageObjects;
}

export const test = baseTest.extend<UpgradeAssistantTestFixtures, ScoutWorkerFixtures>({
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: UpgradeAssistantBrowserAuthFixture) => Promise<void>
  ) => {
    await use({
      ...browserAuth,
      loginAsSuperuser: () => browserAuth.loginAs('superuser'),
      loginAsKibanaAdmin: () => browserAuth.loginWithCustomRole(testData.KIBANA_ADMIN_ROLE),
      loginAsGlobalDashboardReadWithUpgradeAssistant: () =>
        browserAuth.loginWithCustomRole(testData.GLOBAL_DASHBOARD_READ_WITH_UPGRADE_ASSISTANT_ROLE),
    });
  },
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: PageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: UpgradeAssistantPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});

export { testData };
