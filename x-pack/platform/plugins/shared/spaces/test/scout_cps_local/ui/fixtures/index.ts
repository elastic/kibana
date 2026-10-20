/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';

import type { SpacesPageObjects } from '../../../scout/ui/fixtures/page_objects';
import { extendPageObjects } from '../../../scout/ui/fixtures/page_objects';

export interface SpacesCpsTestFixtures extends ScoutTestFixtures {
  pageObjects: SpacesPageObjects;
  /**
   * Space IDs created during a test. Push IDs as they are created; the fixture
   * deletes them after the test (including on failure).
   */
  createdSpaceIds: string[];
}

/**
 * Spaces management Scout fixtures for CPS-local (origin + linked cluster) runs.
 * Suppresses the CPS project-picker tour so it does not obscure management pages.
 */
export const test = baseTest.extend<SpacesCpsTestFixtures, ScoutWorkerFixtures>({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
    });
    await use(context);
  },
  pageObjects: async ({ pageObjects, page, kbnUrl }, use) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page, kbnUrl);
    await use(extendedPageObjects);
  },
  createdSpaceIds: async ({ apiServices }, use) => {
    const ids: string[] = [];
    await use(ids);
    await Promise.all(ids.map((id) => apiServices.spaces.delete(id)));
  },
});
