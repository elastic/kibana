/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures, KibanaUrl } from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';

import type { FleetPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface FleetTestFixtures extends ScoutTestFixtures {
  pageObjects: FleetPageObjects;
}

const LOADING_INDICATOR = 'globalLoadingIndicator';

async function waitForPageReady(page: ScoutPage) {
  try {
    await page.testSubj.locator(LOADING_INDICATOR).waitFor({ state: 'hidden', timeout: 30_000 });
  } catch {
    // Indicator may never appear for already-loaded pages
  }
}

export const test = baseTest.extend<FleetTestFixtures, ScoutWorkerFixtures>({
  page: async (
    { page, kbnUrl }: { page: ScoutPage; kbnUrl: KibanaUrl },
    use: (page: ScoutPage) => Promise<void>
  ) => {
    const originalGoto = page.goto.bind(page);
    const originalGotoApp = page.gotoApp.bind(page);

    page.goto = (async (url: string, options?: Parameters<ScoutPage['goto']>[1]) => {
      const resolvedUrl = url.startsWith('/') ? kbnUrl.get(url) : url;
      const response = await originalGoto(resolvedUrl, options);
      await waitForPageReady(page);
      return response;
    }) as ScoutPage['goto'];

    page.gotoApp = (async (appName: string, options?: Parameters<ScoutPage['gotoApp']>[1]) => {
      const response = await originalGotoApp(appName, options);
      await waitForPageReady(page);
      return response;
    }) as ScoutPage['gotoApp'];

    await use(page);
  },
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: FleetPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: FleetPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
