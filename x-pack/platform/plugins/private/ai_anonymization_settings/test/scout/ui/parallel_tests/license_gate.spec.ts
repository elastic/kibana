/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { mockLicenseType } from '../fixtures/mocks';

spaceTest.describe(
  'Anonymization Settings - Enterprise license gate',
  {
    // The fallback page that proves the router resolved differs per deployment (stateful classic
    // shows a welcome heading, serverless projects show a prompt), so this runs on classic only.
    tag: [...tags.stateful.classic],
  },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest('opens the page on an Enterprise license', async ({ page, pageObjects }) => {
      await mockLicenseType(page, 'enterprise');

      await pageObjects.anonymizationSettings.navigateTo();

      await expect(pageObjects.anonymizationSettings.getPageContainer()).toBeVisible();
    });

    spaceTest(
      'does not open the page on a license below Enterprise',
      async ({ page, pageObjects }) => {
        await mockLicenseType(page, 'platinum');

        await page.gotoApp('management/ai/aiAnonymizationSettings');

        // With the app disabled Management falls back to its landing page; waiting for it proves the
        // router resolved, so an absent page is not just one that has not mounted yet.
        await expect(
          page.getByRole('heading', { name: /Welcome to Stack Management/ })
        ).toBeVisible();
        await expect(pageObjects.anonymizationSettings.getPageContainer()).toBeHidden();
      }
    );
  }
);
