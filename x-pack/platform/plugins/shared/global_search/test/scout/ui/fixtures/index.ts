/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as scoutTest } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { visualTest as scoutVisualTest } from '@kbn/scout-vrt';
import type { GlobalSearchPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface GlobalSearchTestFixtures extends ScoutTestFixtures {
  pageObjects: GlobalSearchPageObjects;
}

const globalSearchFixtures = {
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
};

export const test = scoutTest.extend<GlobalSearchTestFixtures, ScoutWorkerFixtures>(
  globalSearchFixtures
);

export const visualTest = scoutVisualTest.extend<GlobalSearchTestFixtures, ScoutWorkerFixtures>(
  globalSearchFixtures
);
