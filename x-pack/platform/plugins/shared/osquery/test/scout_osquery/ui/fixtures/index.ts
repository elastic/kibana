/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/test';
import type { OsqueryPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

interface OsqueryTestFixtures {
  pageObjects: OsqueryPageObjects;
}

export const test = baseTest.extend<OsqueryTestFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});

export type { KbnClient };
