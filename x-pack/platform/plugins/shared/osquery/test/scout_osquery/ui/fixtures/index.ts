/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';
import type { OsqueryPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

interface OsqueryTestFixtures {
  pageObjects: OsqueryPageObjects;
}

/**
 * Wait for the global loading indicator to disappear. Extracted here so it
 * can be called from the page-wrapper without a circular import.
 */
async function autoWaitForPageReady(page: ScoutPage): Promise<void> {
  await page.testSubj
    .locator('globalLoadingIndicator')
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
}

export const test = baseTest.extend<OsqueryTestFixtures>({
  // Wrap `page` so that every gotoApp / goto / reload automatically waits
  // for the Kibana loading indicator to disappear.
  page: async ({ page }, use) => {
    const originalGotoApp = page.gotoApp.bind(page);
    page.gotoApp = async (...args) => {
      const response = await originalGotoApp(...args);
      await autoWaitForPageReady(page);

      return response;
    };

    const originalGoto = page.goto.bind(page);
    page.goto = async (...args) => {
      const response = await originalGoto(...args);
      await autoWaitForPageReady(page);

      return response;
    };

    const originalReload = page.reload.bind(page);
    page.reload = async (...args) => {
      const response = await originalReload(...args);
      await autoWaitForPageReady(page);

      return response;
    };

    await use(page);
  },
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});

export type { KbnClient };
