/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';
import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import type { StreamsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface StreamsTestFixtures extends ScoutTestFixtures {
  pageObjects: StreamsPageObjects;
}

export const test = baseTest
  .extend({
    // Extend apiServices to provide typed StreamsApiService
    apiServices: async ({ apiServices }, use) => {
      // The runtime object is the same, we just provide explicit types
      const typedApiServices = apiServices as unknown as ApiServicesFixture<
        Condition,
        StreamlangDSL
      >;
      await (use as any)(typedApiServices);
    },
  })
  .extend<StreamsTestFixtures, ScoutWorkerFixtures>({
    pageObjects: async (
      {
        pageObjects,
        page,
      }: {
        pageObjects: StreamsPageObjects;
        page: ScoutPage;
      },
      use: (pageObjects: StreamsPageObjects) => Promise<void>
    ) => {
      const extendedPageObjects = extendPageObjects(pageObjects, page);
      await use(extendedPageObjects);
    },
  });
