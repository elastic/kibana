/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { DataFederationPage } from './page_objects/data_federation_page';

interface DataFederationFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    dataFederation: DataFederationPage;
  };
}

export const test = base.extend<DataFederationFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: ScoutTestFixtures['pageObjects']; page: ScoutPage },
    use
  ) => {
    await use({
      ...pageObjects,
      dataFederation: new DataFederationPage(page),
    } as DataFederationFixtures['pageObjects']);
  },
});

export { CUSTOM_ROLES } from './custom_roles';
