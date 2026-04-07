/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Rule name validation — dedicated page', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.ruleForm.gotoCreate();
  });

  test('displays "Untitled rule" as the default placeholder name', async ({ pageObjects }) => {
    await expect(pageObjects.ruleForm.nameInlineEdit()).toContainText('Untitled rule');
  });

  test('shows "Name is required" error when saving with empty default value', async ({
    pageObjects,
  }) => {
    await pageObjects.ruleForm.clickSave();
    const errorCallout = pageObjects.ruleForm.errorCallout();
    await expect(errorCallout).toBeVisible();
    await expect(errorCallout).toContainText('Name is required');
  });

  test('shows validation error when rule name is cleared after editing', async ({
    pageObjects,
  }) => {
    await test.step('set a name then clear it', async () => {
      await pageObjects.ruleForm.setRuleName('Temporary name');
      await pageObjects.ruleForm.clearRuleName();
    });

    await test.step('attempt to save and verify error is shown', async () => {
      await pageObjects.ruleForm.clickSave();
      const errorCallout = pageObjects.ruleForm.errorCallout();
      await expect(errorCallout).toBeVisible();
      await expect(errorCallout).toContainText('Name is required');
    });
  });

  test('shows name validation error when saving after confirming the default placeholder text', async ({
    pageObjects,
  }) => {
    await test.step('open name edit and save with the default "Untitled rule" text', async () => {
      await pageObjects.ruleForm.setRuleName('Untitled rule');
    });

    await test.step('attempt to save and verify error is shown', async () => {
      await pageObjects.ruleForm.clickSave();
      const errorCallout = pageObjects.ruleForm.errorCallout();
      await expect(errorCallout).toBeVisible();
      await expect(errorCallout).toContainText('Name is required');
    });
  });

  test('error callout scrolls into view on failed submission', async ({ page, pageObjects }) => {
    await test.step('scroll to bottom of the form', async () => {
      await page.locator('#ruleV2Form').evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    });

    await test.step('click save and verify error callout is visible in viewport', async () => {
      await pageObjects.ruleForm.clickSave();
      const errorCallout = pageObjects.ruleForm.errorCallout();
      await expect(errorCallout).toBeVisible();
      await expect(errorCallout).toBeInViewport();
    });
  });

  test('no name validation error with a custom rule name', async ({ page, pageObjects }) => {
    await pageObjects.ruleForm.setRuleName('My custom alert rule');
    await expect(pageObjects.ruleForm.nameInlineEdit()).toContainText('My custom alert rule');

    await pageObjects.ruleForm.clickSave();

    await test.step('verify no name-specific errors appear', async () => {
      const nameRequiredError = page.getByText('Name is required.');
      const uniqueNameError = page.getByText('Please provide a unique rule name.');
      await expect(nameRequiredError).toBeHidden();
      await expect(uniqueNameError).toBeHidden();
    });
  });
});
