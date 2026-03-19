/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import type { InterceptsExtendedPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface InterceptsTestFixtures extends ScoutTestFixtures {
  pageObjects: InterceptsExtendedPageObjects;
}

export const test = base.extend<InterceptsTestFixtures, ScoutWorkerFixtures>({
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
});
