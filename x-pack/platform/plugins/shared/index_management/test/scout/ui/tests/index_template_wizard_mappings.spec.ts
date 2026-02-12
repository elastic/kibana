/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldTextWrapper, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Index template wizard - Mappings step', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');

    // Click Create Template button
    await page.testSubj.locator('createTemplateButton').click();

    // Fill out required fields using EUI wrapper
    const nameField = new EuiFieldTextWrapper(page, { dataTestSubj: 'nameField' });
    await nameField.fill('test-index-template');
    const indexPatternsField = new EuiFieldTextWrapper(page, {
      dataTestSubj: 'indexPatternsField',
    });
    await indexPatternsField.fill('test-index-pattern');

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
    // The Create Field form is already open by default when mappings are empty
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
    // The Create Field form is already open by default when mappings are empty
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
