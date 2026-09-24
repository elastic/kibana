/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type {
  BrowserAuthFixture,
  PageObjects,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';

import * as testData from './constants';
import type { SearchProfilerPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface SearchProfilerBrowserAuthFixture extends BrowserAuthFixture {
  loginAsSearchProfilerUser: () => Promise<void>;
}

export interface SearchProfilerTestFixtures extends ScoutTestFixtures {
  browserAuth: SearchProfilerBrowserAuthFixture;
  pageObjects: SearchProfilerPageObjects;
}

export const test = base.extend<SearchProfilerTestFixtures, ScoutWorkerFixtures>({
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: SearchProfilerBrowserAuthFixture) => Promise<void>
  ) => {
    await use({
      ...browserAuth,
      loginAsSearchProfilerUser: () =>
        browserAuth.loginWithCustomRole(testData.SEARCH_PROFILER_USER_ROLE),
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
    use: (pageObjects: SearchProfilerPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});

export { testData };
