/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import type { MapsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export * from './constants';

export interface MapsTestFixtures extends ScoutTestFixtures {
  pageObjects: MapsPageObjects;
}

export const test = baseTest.extend<MapsTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
