/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as scoutTest } from '@kbn/scout';
import { visualTest as scoutVisualTest } from '@kbn/scout-vrt';

import type { SpacesPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface SpacesTestFixtures extends ScoutTestFixtures {
  pageObjects: SpacesPageObjects;
}

const spacesFixtures = {
  pageObjects: async (
    { pageObjects, page }: ScoutTestFixtures,
    use: (pageObjects: SpacesPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
};

export const test = scoutTest.extend<SpacesTestFixtures, ScoutWorkerFixtures>(spacesFixtures);

export const visualTest = scoutVisualTest.extend<SpacesTestFixtures, ScoutWorkerFixtures>(
  spacesFixtures
);
