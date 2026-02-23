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
import { SETTINGS_OUTPUTS } from '../common/selectors';

test.describe('Fleet settings outputs', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should add ES output', async ({ page }) => {
    await page.goto('/app/fleet/settings');
    await page.testSubj.locator(SETTINGS_OUTPUTS.ADD_BTN).click();
    await page.testSubj.locator(SETTINGS_OUTPUTS.TYPE_INPUT).selectOption('elasticsearch');
    await expect(page.testSubj.locator(SETTINGS_OUTPUTS.NAME_INPUT)).toBeVisible();
  });

  test('should add Remote ES output', async ({ page }) => {
    await page.goto('/app/fleet/settings');
    await page.testSubj.locator(SETTINGS_OUTPUTS.ADD_BTN).click();
    await page.testSubj.locator(SETTINGS_OUTPUTS.TYPE_INPUT).selectOption('remote_elasticsearch');
    await expect(page.testSubj.locator(SETTINGS_OUTPUTS.NAME_INPUT)).toBeVisible();
  });

  test('should add Kafka output', async ({ page }) => {
    await page.goto('/app/fleet/settings');
    await page.testSubj.locator(SETTINGS_OUTPUTS.ADD_BTN).click();
    await page.testSubj.locator(SETTINGS_OUTPUTS.TYPE_INPUT).selectOption('kafka');
    await page.testSubj
      .locator('kafkaAuthenticationUsernamePasswordRadioButton')
      .locator('label')
      .click();
    await expect(page.testSubj.locator(SETTINGS_OUTPUTS.NAME_INPUT)).toBeVisible();
  });
});
