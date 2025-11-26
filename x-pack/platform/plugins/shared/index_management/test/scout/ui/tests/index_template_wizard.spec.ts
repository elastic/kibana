/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Index template wizard - Create', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ pageObjects, page, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
    // Click Create Template button
    await page.testSubj.locator('createTemplateButton').click();
  });

  test.afterEach(async ({ esClient, log }) => {
    try {
      await esClient.indices.deleteIndexTemplate({ name: 'test-index-template' });
    } catch (e) {
      log.debug(
        `Template cleanup failed for test-index-template: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  });

  test('should set the correct page title', async ({ page }) => {
    await expect(page.testSubj.locator('pageTitle')).toBeVisible();
    await expect(page.testSubj.locator('pageTitle')).toHaveText('Create template');
  });

  test('renders logistics (step 1)', async ({ page, pageObjects }) => {
    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Logistics');
    await pageObjects.indexManagement.indexTemplateWizard.completeStepOne();
  });

  test('renders component templates (step 2)', async ({ page, pageObjects }) => {
    // Fill logistics step
    await pageObjects.indexManagement.indexTemplateWizard.completeStepOne();

    // Verify empty prompt
    await expect(page.testSubj.locator('emptyPrompt')).toBeVisible();

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();
  });

  test('renders index settings (step 3)', async ({ page, pageObjects }) => {
    // Fill logistics step
    await pageObjects.indexManagement.indexTemplateWizard.completeStepOne();

    // Skip component templates step
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Index settings (optional)');

    // Verify that index mode callout is displayed
    await expect(page.testSubj.locator('indexModeCallout')).toHaveText(
      'The index.mode setting has been set to Standard within the Logistics step. Any changes to index.mode set on this page will be overwritten by the Logistics selection.'
    );

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();
  });

  test('renders mappings (step 4)', async ({ page, pageObjects }) => {
    // Fill logistics step
    await pageObjects.indexManagement.indexTemplateWizard.completeStepOne();

    // Skip component templates and settings steps
    await pageObjects.indexManagement.clickNextButton();
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Mappings (optional)');

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();
  });

  test('renders aliases (step 5)', async ({ page, pageObjects }) => {
    // Fill logistics step
    await pageObjects.indexManagement.indexTemplateWizard.completeStepOne();

    // Skip component templates, settings, and mappings steps
    await pageObjects.indexManagement.clickNextButton();
    await pageObjects.indexManagement.clickNextButton();
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Aliases (optional)');

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();
  });

  test('renders review template (step 6)', async ({ page, pageObjects }) => {
    // Fill logistics step
    await pageObjects.indexManagement.indexTemplateWizard.completeStepOne();

    // Skip all intermediate steps
    await pageObjects.indexManagement.clickNextButton();
    await pageObjects.indexManagement.clickNextButton();
    await pageObjects.indexManagement.clickNextButton();
    await pageObjects.indexManagement.clickNextButton();

    // Verify step title
    await expect(page.testSubj.locator('stepTitle')).toHaveText(
      "Review details for 'test-index-template'"
    );

    // Verify that summary exists
    await expect(page.testSubj.locator('summaryTabContent')).toBeVisible();

    // Verify that index mode is set to "Standard"
    await expect(page.testSubj.locator('indexModeTitle')).toBeVisible();
    await expect(page.testSubj.locator('indexModeValue')).toHaveText('Standard');

    // Click Create template
    await pageObjects.indexManagement.clickNextButton();
  });
});
