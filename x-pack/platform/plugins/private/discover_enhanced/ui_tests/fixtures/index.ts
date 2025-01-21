/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  test as baseTest,
  spaceTest as spaceBaseTest,
  PageObjects,
  createLazyPageObject,
  ScoutSingleThreadTestFixtures,
  ScoutSingleThreadWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout';
import { DemoPage } from './page_objects';

export interface SingleThreadTestFixtures extends ScoutSingleThreadTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const test = baseTest.extend<SingleThreadTestFixtures, ScoutSingleThreadWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SingleThreadTestFixtures['pageObjects'];
      page: SingleThreadTestFixtures['page'];
    },
    use: (pageObjects: SingleThreadTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      demo: createLazyPageObject(DemoPage, page),
    };

    await use(extendedPageObjects);
  },
});

export interface ParallelRunTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const spaceTest = spaceBaseTest.extend<ParallelRunTestFixtures, ScoutParallelWorkerFixtures>(
  {
    pageObjects: async (
      {
        pageObjects,
        page,
      }: {
        pageObjects: ParallelRunTestFixtures['pageObjects'];
        page: ParallelRunTestFixtures['page'];
      },
      use: (pageObjects: ParallelRunTestFixtures['pageObjects']) => Promise<void>
    ) => {
      const extendedPageObjects = {
        ...pageObjects,
        demo: createLazyPageObject(DemoPage, page),
      };

      await use(extendedPageObjects);
    },
  }
);

export * as testData from './constants';
export * as assertionMessages from './assertion_messages';
