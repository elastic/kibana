/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PageObjects,
  ScoutTestFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { createTest } from '@kbn/scout';
import { DemoPage } from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const test = createTest<{
  demo: DemoPage;
}>({
  demo: DemoPage,
});

export interface ExtParallelRunTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  ExtParallelRunTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtParallelRunTestFixtures['pageObjects'];
      page: ExtParallelRunTestFixtures['page'];
    },
    use: (pageObjects: ExtParallelRunTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      demo: createLazyPageObject(DemoPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
export * as assertionMessages from './assertion_messages';
