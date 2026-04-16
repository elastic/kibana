/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as scoutTest } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { visualTest as scoutVisualTest } from '@kbn/scout-vrt';
import type { InterceptsExtendedPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface InterceptsTestFixtures extends ScoutTestFixtures {
  pageObjects: InterceptsExtendedPageObjects;
}

const interceptsFixtures = {
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: InterceptsExtendedPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: InterceptsExtendedPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
};

export const test = scoutTest.extend<InterceptsTestFixtures, ScoutWorkerFixtures>(
  interceptsFixtures
);

export const visualTest = scoutVisualTest.extend<InterceptsTestFixtures, ScoutWorkerFixtures>(
  interceptsFixtures
);
