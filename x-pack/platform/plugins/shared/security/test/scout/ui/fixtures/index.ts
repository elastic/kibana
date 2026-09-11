/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';

import {
  ApiKeysApp,
  SecurityUsersPage,
  SecurityRolesPage,
  SecurityRoleMappingsPage,
  SecurityAccountSettingsPage,
} from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    apiKeys: ApiKeysApp;
    securityUsers: SecurityUsersPage;
    securityRoles: SecurityRolesPage;
    securityRoleMappings: SecurityRoleMappingsPage;
    securityAccountSettings: SecurityAccountSettingsPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      apiKeys: createLazyPageObject(ApiKeysApp, page),
      securityUsers: createLazyPageObject(SecurityUsersPage, page),
      securityRoles: createLazyPageObject(SecurityRolesPage, page),
      securityRoleMappings: createLazyPageObject(SecurityRoleMappingsPage, page),
      securityAccountSettings: createLazyPageObject(SecurityAccountSettingsPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * from './helpers';
export * as testData from './constants';
