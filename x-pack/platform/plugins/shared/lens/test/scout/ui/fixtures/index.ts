/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, ScoutParallelTestFixtures, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { spaceTest as baseSpaceTest } from '@kbn/scout';
import type { LensPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export * as testData from './constants';
export * from './helpers';
export * from './open_in_lens_helpers';
export * from './tsdb_helpers';

export interface LensParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: LensPageObjects;
}

export const spaceTest = baseSpaceTest.extend<
  LensParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: LensPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: LensPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
