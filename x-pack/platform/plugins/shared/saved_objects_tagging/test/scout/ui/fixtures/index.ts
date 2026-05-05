/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import type { TaggingPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface TaggingTestFixtures extends ScoutTestFixtures {
  pageObjects: TaggingPageObjects;
}

export const test = baseTest.extend<TaggingTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: TaggingPageObjects; page: ScoutPage },
    use: (pageObjects: TaggingPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
