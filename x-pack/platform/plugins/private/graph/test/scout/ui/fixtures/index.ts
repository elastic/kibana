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
import { GraphListingPage } from './page_objects';

export interface GraphTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    graphListing: GraphListingPage;
  };
}

export const spaceTest = spaceBaseTest.extend<GraphTestFixtures, ScoutParallelWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: GraphTestFixtures['pageObjects'];
      page: GraphTestFixtures['page'];
    },
    use: (pageObjects: GraphTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      graphListing: createLazyPageObject(GraphListingPage, page),
    });
  },
});
