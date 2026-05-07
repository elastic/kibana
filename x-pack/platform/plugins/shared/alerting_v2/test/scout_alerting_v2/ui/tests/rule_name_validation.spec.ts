/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Rule name validation — dedicated page', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAlertingV2Editor();
    await pageObjects.ruleForm.gotoCreate();
  });

  test('displays "Untitled rule" as the default placeholder', async ({ pageObjects }) => {
    await expect(pageObjects.ruleForm.nameInput).toHaveAttribute('placeholder', 'Untitled rule');
  });

  test('shows "Name is required" error when saving with empty default value', async ({
    pageObjects,
  }) => {
    await pageObjects.ruleForm.clickSave();
    await expect(pageObjects.ruleForm.errorCallout).toBeVisible();
    await expect(pageObjects.ruleForm.errorCallout).toContainText('Name is required');
  });

  test('shows validation error when rule name is cleared after editing', async ({
    page,
    pageObjects,
  }) => {
    await test.step('set a name then clear it', async () => {
      await pageObjects.ruleForm.setRuleName('Temporary name');
      await pageObjects.ruleForm.clearRuleName();
    });

    await test.step('attempt to save and verify error is shown', async () => {
      await pageObjects.ruleForm.clickSave();
      await expect(pageObjects.ruleForm.nameInput).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Name is required.')).toBeVisible();
    });
  });

  test('shows name validation error when saving after confirming the default placeholder text', async ({
    page,
    pageObjects,
  }) => {
    await test.step('open name edit and save with the default "Untitled rule" text', async () => {
      await pageObjects.ruleForm.setRuleName('Untitled rule');
    });

    await test.step('attempt to save and verify error is shown', async () => {
      await pageObjects.ruleForm.clickSave();
      await expect(pageObjects.ruleForm.nameInput).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Name is required.')).toBeVisible();
    });
  });

  test('error callout scrolls into view on failed submission', async ({ pageObjects }) => {
    await pageObjects.ruleForm.scrollFormToBottom();
    await pageObjects.ruleForm.clickSave();
    await expect(pageObjects.ruleForm.errorCallout).toBeVisible();
    await expect(pageObjects.ruleForm.errorCallout).toBeInViewport();
  });

  test('no name validation error with a custom rule name', async ({ page, pageObjects }) => {
    await pageObjects.ruleForm.setRuleName('My custom alert rule');
    await expect(pageObjects.ruleForm.nameInput).toHaveValue('My custom alert rule');

    await pageObjects.ruleForm.clickSave();

    await test.step('verify no name-specific errors appear', async () => {
      const nameRequiredError = page.getByText('Name is required.');
      await expect(nameRequiredError).toBeHidden();
    });
  });
});
