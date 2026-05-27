/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';

import type { SpacesPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface SpacesTestFixtures extends ScoutTestFixtures {
  pageObjects: SpacesPageObjects;
}

export const test = baseTest.extend<SpacesTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
