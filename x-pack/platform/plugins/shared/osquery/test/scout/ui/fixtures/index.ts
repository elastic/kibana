/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { ResponseActionsFormPage } from './page_objects';

export interface OsqueryScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    responseActionsForm: ResponseActionsFormPage;
  };
}

export const test = baseTest.extend<OsqueryScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: OsqueryScoutTestFixtures['pageObjects'];
      page: OsqueryScoutTestFixtures['page'];
    },
    use: (pageObjects: OsqueryScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      responseActionsForm: createLazyPageObject(ResponseActionsFormPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
