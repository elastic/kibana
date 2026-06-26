/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { CrossClusterReplicationPage } from './page_objects/cross_cluster_replication_page';

interface CcrFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    crossClusterReplication: CrossClusterReplicationPage;
  };
}

export const test = base.extend<CcrFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: ScoutTestFixtures['pageObjects']; page: ScoutPage },
    use
  ) => {
    await use({
      ...pageObjects,
      crossClusterReplication: new CrossClusterReplicationPage(page),
    } as CcrFixtures['pageObjects']);
  },
});

export { CUSTOM_ROLES } from './custom_roles';
