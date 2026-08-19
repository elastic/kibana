/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { CustomContentPanelPage } from './page_objects';

export interface CustomContentTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    customContentPanel: CustomContentPanelPage;
  };
}

export const test = baseTest.extend<CustomContentTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: CustomContentTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: CustomContentTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      customContentPanel: createLazyPageObject(CustomContentPanelPage, page),
    });
  },
});
