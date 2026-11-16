/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { KibanaRole, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
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

const INDICES_READ = [
  { names: ['*'], privileges: ['read', 'view_index_metadata', 'read_view_metadata'] },
];

// `monitor` grants read access to Search boost; `manage` (edit) is left out on purpose.
export const SEARCH_BOOST_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['monitor'], indices: INDICES_READ },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

// Has neither `monitor` nor `manage`; `read_view_metadata` keeps ES|QL Views in the Data management panel.
export const NO_SEARCH_BOOST_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: INDICES_READ },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};
