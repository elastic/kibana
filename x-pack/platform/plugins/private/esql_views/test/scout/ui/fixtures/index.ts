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
import { createLazyPageObject, spaceTest as spaceBaseTest } from '@kbn/scout';
import { EsqlViewsPage } from './page_objects';

export interface EsqlViewsTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    esqlViews: EsqlViewsPage;
  };
}

export const spaceTest = spaceBaseTest.extend<EsqlViewsTestFixtures, ScoutParallelWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: EsqlViewsTestFixtures['pageObjects'];
      page: EsqlViewsTestFixtures['page'];
    },
    use: (pageObjects: EsqlViewsTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      esqlViews: createLazyPageObject(EsqlViewsPage, page),
    });
  },
});
