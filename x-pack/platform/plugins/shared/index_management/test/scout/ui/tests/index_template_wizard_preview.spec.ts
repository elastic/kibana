/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Index template wizard - Preview template', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
  });

  test.afterEach(async ({ esClient, log }) => {
    try {
      await esClient.indices.deleteIndexTemplate({ name: 'a-star' });
    } catch (e) {
      log.debug(
        `Template cleanup failed for a-star: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  });

  test('can preview index template that matches a_fake_index_pattern_that_wont_match_any_indices', async ({
    page,
    pageObjects,
  }) => {
    // Click Create Template button
    await page.testSubj.locator('createTemplateButton').click();
    await expect(page.testSubj.locator('pageTitle')).toHaveText('Create template');
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Logistics');

    // Fill out required fields
    await page.testSubj.locator('nameField').locator('input').fill('a-star');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('a*');
    await page.testSubj.locator('priorityField').locator('input').fill('1000');

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();

    // Verify empty prompt
    await expect(page.testSubj.locator('emptyPrompt')).toBeVisible();

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Index settings (optional)');

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Mappings (optional)');

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Aliases (optional)');

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText("Review details for 'a-star'");

    // Verify that summary exists
    await expect(page.testSubj.locator('summaryTabContent')).toBeVisible();

    // Verify that index mode is set to "Standard"
    await expect(page.testSubj.locator('indexModeTitle')).toBeVisible();
    await expect(page.testSubj.locator('indexModeValue')).toHaveText('Standard');

    // Click Create template
    await pageObjects.indexManagement.clickNextButton();

    // Click preview tab
    await page.testSubj.locator('previewTabBtn').click();

    const templatePreview = await page.testSubj.locator('simulateTemplatePreview').textContent();
    expect(templatePreview).not.toContain('error');

    await page.testSubj.locator('closeDetailsButton').click();
  });
});
