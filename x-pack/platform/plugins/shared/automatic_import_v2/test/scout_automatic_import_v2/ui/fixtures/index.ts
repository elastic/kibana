/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';

import type { AIV2PageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface AIV2TestFixtures extends ScoutTestFixtures {
  pageObjects: AIV2PageObjects;
}

export const test = baseTest.extend<AIV2TestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AIV2PageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: AIV2PageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
