/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { CanvasPage } from './page_objects';

export interface CanvasTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    canvas: CanvasPage;
  };
}

export const test = baseTest.extend<CanvasTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: CanvasTestFixtures['pageObjects'];
      page: CanvasTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (pageObjects: CanvasTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      canvas: createLazyPageObject(CanvasPage, page, kbnUrl),
    });
  },
});

export * as testData from './constants';
