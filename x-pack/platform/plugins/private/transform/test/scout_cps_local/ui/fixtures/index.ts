/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import {
  getTransformApiService,
  type TransformApiService,
} from '../../../scout/api/services/transform_api_service';
import { TransformPage } from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    transform: TransformPage;
  };
}

export interface ExtScoutWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: ScoutWorkerFixtures['apiServices'] & {
    transform: TransformApiService;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ExtScoutWorkerFixtures>({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
    });
    await use(context);
  },

  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      transform: createLazyPageObject(TransformPage, page),
    };

    await use(extendedPageObjects);
  },

  apiServices: [
    async ({ apiServices, esClient }, use) => {
      const extendedApiServices = apiServices as ExtScoutWorkerFixtures['apiServices'];
      extendedApiServices.transform = getTransformApiService(esClient);
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
