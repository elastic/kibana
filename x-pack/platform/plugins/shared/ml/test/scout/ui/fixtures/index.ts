/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import type { MlUiPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export { CUSTOM_ROLES } from '../../api/fixtures/custom_roles';

export interface MlUiTestFixtures extends ScoutTestFixtures {
  pageObjects: MlUiPageObjects;
}

export const test = baseTest.extend<MlUiTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutPage },
    use: (pageObjects: MlUiPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});

export * as testData from './constants';
