/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';
import type { GlobalSearchPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface GlobalSearchTestFixtures extends ScoutTestFixtures {
  pageObjects: GlobalSearchPageObjects;
}

export const test = baseTest.extend<GlobalSearchTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: GlobalSearchPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: GlobalSearchPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
