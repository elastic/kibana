/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { SearchBoostPage } from './page_objects/search_boost_page';

interface SearchBoostTestFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    searchBoost: SearchBoostPage;
  };
}

export const test = base.extend<SearchBoostTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: ScoutTestFixtures['pageObjects']; page: ScoutPage },
    use: (pageObjects: SearchBoostTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({ ...pageObjects, searchBoost: new SearchBoostPage(page) });
  },
});
