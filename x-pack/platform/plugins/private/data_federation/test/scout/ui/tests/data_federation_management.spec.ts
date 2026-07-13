/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

const checkA11yWithRetry = async (
  page: { checkA11y: Function; waitForTimeout: (ms: number) => Promise<void> },
  options: { include: string[] }
): Promise<{ violations: unknown[] }> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return (await page.checkA11y(options)) as { violations: unknown[] };
    } catch (error) {
      lastError = error;
      const message = String(error);
      if (!message.includes('Execution context was destroyed')) {
        throw error;
      }
      await page.waitForTimeout(500 * attempt);
    }
  }
  throw lastError;
};

test.describe('ES|QL Data Federation — Stack Management', { tag: tags.stateful.classic }, () => {
  test('loads the management app and can open the connect data source flyout', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

    await test.step('navigate to the Data Federation management app', async () => {
      await pageObjects.dataFederation.goto();
    });

    await test.step('page header renders', async () => {
      await expect(pageObjects.dataFederation.pageTitle).toHaveText('ES|QL Data Federation');
      await expect(pageObjects.dataFederation.tabs).toBeVisible();
    });

    await test.step('data sources table and primary action are visible', async () => {
      await expect(pageObjects.dataFederation.dataSourcesTable).toBeVisible();
      await expect(pageObjects.dataFederation.connectDataSourceButton).toBeVisible();
    });

    await test.step('page has no accessibility violations', async () => {
      const { violations } = await checkA11yWithRetry(page, { include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('open connect data source flyout', async () => {
      await pageObjects.dataFederation.connectDataSourceButton.click();
      await expect(pageObjects.dataFederation.createDataSourceFlyout).toBeVisible();
      await expect(page.testSubj.locator('createDataSourceFlyoutType')).toBeVisible();
      await expect(page.testSubj.locator('createDataSourceFlyoutName')).toBeVisible();
    });

    await test.step('flyout has no accessibility violations', async () => {
      const { violations } = await checkA11yWithRetry(page, { include: ['.euiFlyout'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('close the flyout', async () => {
      await pageObjects.dataFederation.createDataSourceFlyoutCancel.click();
      await expect(pageObjects.dataFederation.createDataSourceFlyout).toBeHidden();
    });
  });
});
