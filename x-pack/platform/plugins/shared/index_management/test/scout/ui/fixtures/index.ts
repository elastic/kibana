/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import type { IndexManagementPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface ConsoleTestFixtures extends ScoutTestFixtures {
  pageObjects: IndexManagementPageObjects;
}

export const test = base.extend<ConsoleTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: IndexManagementPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: IndexManagementPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
