/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as baseSpaceTest } from '@kbn/scout';
import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import type { LensFieldsListPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export * as testData from './constants';
export * from './helpers';

export interface LensFieldsListTestFixtures extends ScoutTestFixtures {
  pageObjects: LensFieldsListPageObjects;
}

export const spaceTest = baseSpaceTest.extend<LensFieldsListTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutPage },
    use: (pageObjects: LensFieldsListPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
