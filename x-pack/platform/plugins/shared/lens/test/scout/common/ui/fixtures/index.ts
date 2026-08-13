/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { spaceTest as baseSpaceTest, test as baseTest } from '@kbn/scout';
import type { LensPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export * as testData from './constants';
export * from './helpers';
export * from './page_objects';
export * from './saved_object_helpers';

export interface LensParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: LensPageObjects;
}

export const spaceTest = baseSpaceTest.extend<
  LensParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
});

export interface LensTestFixtures extends ScoutTestFixtures {
  pageObjects: LensPageObjects;
}

export const test = baseTest.extend<LensTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
