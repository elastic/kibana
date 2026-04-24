/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';

test.describe('Rules Page - Header - Viewer', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.rulesPage.goto();
    await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
  });

  test('should open settings flyout, verify buttons state, and close successfully', async ({
    pageObjects,
  }) => {
    await pageObjects.rulesPage.openSettingsFlyout();
    await pageObjects.rulesPage.expectSettingsFlyoutVisible();

    await expect(pageObjects.rulesPage.settingsFlyoutCancelButton).toBeVisible();
    await expect(pageObjects.rulesPage.settingsFlyoutCancelButton).toBeEnabled();
    await expect(pageObjects.rulesPage.settingsFlyoutSaveButton).toBeVisible();
    await expect(pageObjects.rulesPage.settingsFlyoutSaveButton).toBeDisabled();

    await pageObjects.rulesPage.closeSettingsFlyout();

    await expect(pageObjects.rulesPage.settingsFlyout).toBeHidden();
  });
});
