/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import type { WatcherPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface WatcherTestFixtures extends ScoutTestFixtures {
  pageObjects: WatcherPageObjects;
}

export const test = base.extend<WatcherTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutPage },
    use: (pageObjects: WatcherPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
