/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import type { GrokDebuggerPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface GrokDebuggerTestFixtures extends ScoutTestFixtures {
  pageObjects: GrokDebuggerPageObjects;
}

export const test = base.extend<GrokDebuggerTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: PageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: GrokDebuggerPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
