/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
// import { CUSTOM_ROLES } from './custom_roles';

test.describe('Index template wizard - Create', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    // await browserAuth.loginWithCustomRole(CUSTOM_ROLES.indexManagement);
    await browserAuth.loginAsAdmin();
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

    // Fill out required fields
    await page.testSubj.locator('nameField').locator('input').fill('test-index-template');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();
  });

  test('renders component templates (step 2)', async ({ page, pageObjects }) => {
    // Fill logistics step
    await page.testSubj.locator('nameField').locator('input').fill('test-index-template');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');
    await pageObjects.indexManagement.clickNextButton();

    // Verify empty prompt
    await expect(page.testSubj.locator('emptyPrompt')).toBeVisible();

    // Click Next button
    await pageObjects.indexManagement.clickNextButton();
  });

  test('renders index settings (step 3)', async ({ page, pageObjects }) => {
    // Fill logistics step
    await page.testSubj.locator('nameField').locator('input').fill('test-index-template');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');
    await pageObjects.indexManagement.clickNextButton();

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
    await page.testSubj.locator('nameField').locator('input').fill('test-index-template');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');
    await pageObjects.indexManagement.clickNextButton();

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
    await page.testSubj.locator('nameField').locator('input').fill('test-index-template');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');
    await pageObjects.indexManagement.clickNextButton();

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
    await page.testSubj.locator('nameField').locator('input').fill('test-index-template');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');
    await pageObjects.indexManagement.clickNextButton();

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

test.describe('Index template wizard - Preview template', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    // await browserAuth.loginWithCustomRole(CUSTOM_ROLES.indexManagement);
    await browserAuth.loginAsAdmin();
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

test.describe('Index template wizard - Mappings step', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    // await browserAuth.loginWithCustomRole(CUSTOM_ROLES.indexManagement);
    await browserAuth.loginAsAdmin();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');

    // Click Create Template button
    await page.testSubj.locator('createTemplateButton').click();

    // Fill out required fields
    await page.testSubj.locator('nameField').locator('input').fill('test-index-template');
    await page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');

    // Go to Mappings step
    await page.testSubj.locator('formWizardStep-3').click();
    await expect(page.testSubj.locator('stepTitle')).toHaveText('Mappings (optional)');
  });

  test.afterEach(async ({ esClient, log }) => {
    try {
      await esClient.indices.deleteIndexTemplate({ name: 'test-index-template' });
    } catch (e) {
      log.debug(
        `Template cleanup failed in mappings test: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  });

  test("clearing up the Numeric subtype dropdown doesn't break the page", async ({
    page,
    pageObjects,
  }) => {
    // Add a mapping field
    // Select Numeric type
    await pageObjects.indexManagement.setComboBox('fieldType', 'Numeric');

    // Clear up subtype dropdown
    await page.testSubj.locator('fieldSubType').click();
    await page.keyboard.press('Backspace');

    // Verify that elements are still visible
    await expect(page.testSubj.locator('addFieldButton')).toBeVisible();
    await expect(page.testSubj.locator('fieldType')).toBeVisible();
    await expect(page.testSubj.locator('fieldSubType')).toBeVisible();
    await expect(page.testSubj.locator('nextButton')).toBeVisible();
  });

  test("clearing up the Range subtype dropdown doesn't break the page", async ({
    page,
    pageObjects,
  }) => {
    // Add a mapping field
    // Select Range type
    await pageObjects.indexManagement.setComboBox('fieldType', 'Range');

    // Clear up subtype dropdown
    await page.testSubj.locator('fieldSubType').click();
    await page.keyboard.press('Backspace');

    // Verify that elements are still visible
    await expect(page.testSubj.locator('addFieldButton')).toBeVisible();
    await expect(page.testSubj.locator('fieldType')).toBeVisible();
    await expect(page.testSubj.locator('fieldSubType')).toBeVisible();
    await expect(page.testSubj.locator('nextButton')).toBeVisible();
  });

  test("advanced options tab doesn't add default values to request by default", async ({
    page,
    pageObjects,
    log,
  }) => {
    await pageObjects.indexManagement.changeMappingsEditorTab('advancedOptions');
    await page.testSubj.locator('previewIndexTemplate').click();
    const templatePreview = await page.testSubj.locator('simulateTemplatePreview').textContent();

    log.debug(`Template preview text: ${templatePreview}`);

    // All advanced options should not be part of the request
    expect(templatePreview).not.toContain('"dynamic"');
    expect(templatePreview).not.toContain('"subobjects"');
    expect(templatePreview).not.toContain('"dynamic_date_formats"');
    expect(templatePreview).not.toContain('"date_detection"');
    expect(templatePreview).not.toContain('"numeric_detection"');
  });

  test('advanced options tab adds the set values to the request', async ({
    page,
    pageObjects,
    log,
  }) => {
    await pageObjects.indexManagement.changeMappingsEditorTab('advancedOptions');

    // Toggle the subobjects field to false
    await page.testSubj.locator('subobjectsToggle').click();

    await page.testSubj.locator('previewIndexTemplate').click();
    const templatePreview = await page.testSubj.locator('simulateTemplatePreview').textContent();

    log.debug(`Template preview text: ${templatePreview}`);

    // Only the subobjects option should be part of the request
    expect(templatePreview).toContain('"subobjects": false');
    expect(templatePreview).not.toContain('"dynamic"');
    expect(templatePreview).not.toContain('"dynamic_date_formats"');
    expect(templatePreview).not.toContain('"date_detection"');
    expect(templatePreview).not.toContain('"numeric_detection"');
  });
});
