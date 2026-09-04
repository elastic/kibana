/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PageObjects,
  ScoutPage,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { CustomContentPanelPage } from './page_objects';

export interface CustomContentTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    customContentPanel: CustomContentPanelPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  CustomContentTestFixtures,
  ScoutParallelWorkerFixtures
>({
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
