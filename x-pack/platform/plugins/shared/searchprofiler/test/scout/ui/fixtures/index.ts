/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import type { SearchProfilerPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface SearchProfilerTestFixtures extends ScoutTestFixtures {
  pageObjects: SearchProfilerPageObjects;
}

export const test = base.extend<SearchProfilerTestFixtures, ScoutWorkerFixtures>({
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
