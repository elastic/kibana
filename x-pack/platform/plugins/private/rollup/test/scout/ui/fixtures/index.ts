/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { RollupPage } from './page_objects/rollup_page';
import { RollupDataViewPage } from './page_objects/rollup_data_view_page';
import { TsvbPage } from './page_objects/tsvb_page';

interface RollupFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    rollup: RollupPage;
    rollupDataView: RollupDataViewPage;
    tsvb: TsvbPage;
  };
}

export const test = base.extend<RollupFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: ScoutTestFixtures['pageObjects']; page: ScoutPage },
    use
  ) => {
    await use({
      ...pageObjects,
      rollup: new RollupPage(page),
      rollupDataView: new RollupDataViewPage(page),
      tsvb: new TsvbPage(page),
    } as RollupFixtures['pageObjects']);
  },
});

export * as testData from './constants';
export {
  createMockRollupIndex,
  seedSourceIndices,
  deleteAllRollupJobs,
  cleanupRollupIndices,
  seedHybridRollup,
  cleanupHybridIndices,
  createAlias,
  seedTsvbRollup,
  cleanupTsvbIndices,
} from './rollup_api';
