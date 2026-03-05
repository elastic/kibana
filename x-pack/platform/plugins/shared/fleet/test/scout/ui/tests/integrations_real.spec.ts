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
import { INTEGRATIONS_SEARCHBAR, getIntegrationCard } from '../common/selectors';

test.describe('Integrations real', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should browse integrations with different viewports', async ({ page }) => {
    await page.goto('/app/integrations');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.testSubj.locator(INTEGRATIONS_SEARCHBAR.INPUT)).toBeVisible();

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(page.testSubj.locator(INTEGRATIONS_SEARCHBAR.INPUT)).toBeVisible();
  });

  test('should filter integrations by category', async ({ page }) => {
    await page.goto('/app/integrations');
    await page.testSubj.locator('epmList.categories.security').click();
    await expect(page.testSubj.locator('epmList.integrationCards')).toBeVisible();
  });

  test('should search for integrations', async ({ page }) => {
    await page.goto('/app/integrations');
    await page.testSubj.locator(INTEGRATIONS_SEARCHBAR.INPUT).fill('nginx');
    await expect(page.testSubj.locator(getIntegrationCard('nginx'))).toBeVisible({
      timeout: 10_000,
    });
  });
});
