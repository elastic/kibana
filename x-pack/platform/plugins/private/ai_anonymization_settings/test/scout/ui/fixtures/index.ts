/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PageObjects,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { AnonymizationSettingsPage } from './page_objects';

export interface AnonymizationSettingsParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    anonymizationSettings: AnonymizationSettingsPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  AnonymizationSettingsParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AnonymizationSettingsParallelTestFixtures['pageObjects'];
      page: AnonymizationSettingsParallelTestFixtures['page'];
    },
    use: (pageObjects: AnonymizationSettingsParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      anonymizationSettings: createLazyPageObject(AnonymizationSettingsPage, page),
    };

    await use(extendedPageObjects);
  },
});
