/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole, KibanaUrl, ScoutPage } from '@kbn/scout';
import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const CONNECTORS_APP_PATH =
  '/app/management/insightsAndAlerting/triggersActionsConnectors' as const;

const CONNECTORS_LIST_SELECTORS = {
  SEARCH_INPUT: '[data-test-subj="actionsList"] .euiFieldSearch',
  TABLE_LOADED: '.euiBasicTable[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)',
} as const;

const CONNECTORS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['.alerts-*', 'scout-threshold-rule-test*'],
        privileges: ['read', 'view_index_metadata'],
      },
      {
        names: ['scout-idx-*'],
        privileges: ['create_index', 'write'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: { actions: ['all'], stackAlerts: ['all'] },
      spaces: ['*'],
    },
  ],
};

const navigateToConnectors = async (page: ScoutPage, kbnUrl: KibanaUrl) => {
  await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor({ timeout: 30_000 });
};

const searchConnectors = async (page: ScoutPage, name: string) => {
  const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
  await searchBox.fill(name, { timeout: 30_000 });
  await searchBox.press('Enter');
  await page
    .locator('.euiBasicTable[data-test-subj="actionsTable"].euiBasicTable-loading')
    .waitFor({ state: 'visible', timeout: 1_000 })
    .catch(() => {});
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
};

const openConnectorFlyout = async (page: ScoutPage) => {
  await page.locator('[data-test-subj="connectorsTableCell-name"] button').click();
};

test.describe('Preconfigured connector functionality', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(CONNECTORS_ROLE);
  });

  test('should not be able to delete a preconfigured connector', async ({ page, kbnUrl }) => {
    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, 'Serverlog');

    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await expect(page.testSubj.locator('deleteConnector')).toBeHidden();
    await expect(page.testSubj.locator('preConfiguredTitleMessage')).toBeVisible();
    await expect(
      page.testSubj.locator('checkboxSelectRow-preconfigured_my-server-log')
    ).toBeDisabled();
  });

  test('should not be able to edit a preconfigured connector', async ({ page, kbnUrl }) => {
    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, 'test-preconfigured-email');

    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await expect(page.testSubj.locator('preConfiguredTitleMessage')).toBeVisible();

    await openConnectorFlyout(page);

    await expect(page.testSubj.locator('preconfiguredBadge')).toBeVisible();
    await expect(page.testSubj.locator('edit-connector-flyout-save-btn')).toBeHidden();

    await page.testSubj.click('euiFlyoutCloseButton');
  });
});
