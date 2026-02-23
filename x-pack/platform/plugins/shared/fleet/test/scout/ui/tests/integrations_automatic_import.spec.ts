/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { setupFleetServer } from '../common/api_helpers';
import { ASSISTANT_BUTTON, UPLOAD_PACKAGE_LINK } from '../common/selectors';

test.describe('Integrations automatic import', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should show create integration landing page', async ({ page }) => {
    await page.goto('/app/integrations/create');
    await expect(page.testSubj.locator(ASSISTANT_BUTTON)).toBeVisible();
    await expect(page.testSubj.locator(UPLOAD_PACKAGE_LINK)).toBeVisible();
  });

  test('should navigate to assistant', async ({ page }) => {
    await page.goto('/app/integrations/create');
    await page.testSubj.locator(ASSISTANT_BUTTON).click();
    await expect(page).toHaveURL(/\/create\/assistant/);
  });

  test('should navigate to upload', async ({ page }) => {
    await page.goto('/app/integrations/create');
    await page.testSubj.locator(UPLOAD_PACKAGE_LINK).click();
    await expect(page).toHaveURL(/\/create\/upload/);
  });
});
