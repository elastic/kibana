/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const INDEX_TEMPLATE_NAME = 'index-template-test-name';

// Stateful only: serverless does not render the mappings editor's `_source` section
// (`xpack.index_management.enableMappingsSourceFieldSection: false`).
test.describe('Index templates tab - source field', { tag: tags.stateful.classic }, () => {
  // Seed a logsdb data stream template, then open it in the edit wizard.
  test.beforeEach(async ({ browserAuth, esClient, page, pageObjects }) => {
    await esClient.indices.putIndexTemplate({
      name: INDEX_TEMPLATE_NAME,
      index_patterns: ['logsdb-test-index-pattern'],
      data_stream: {},
      template: { settings: { index: { mode: 'logsdb' } } },
    });
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
    await pageObjects.indexManagement.clickTemplateDetailsLink(INDEX_TEMPLATE_NAME);
    await page.testSubj.locator('manageTemplateButton').click();
    await page.testSubj.locator('editIndexTemplateButton').click();
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE_NAME }, { ignore: [404] });
  });

  test('can not disable synthetic source in an index template with logsdb index mode', async ({
    page,
    pageObjects,
  }) => {
    // Navigate to Mappings > Advanced options and disable _source
    await page.testSubj.locator('formWizardStep-3').click();
    await page.testSubj.locator('advancedOptionsTab').click();
    await page.testSubj.locator('sourceValueField').click();
    await page.testSubj.locator('disabledSourceFieldOption').click();

    // Navigate to the last step of the wizard and try to save
    await page.testSubj.locator('formWizardStep-5').click();
    await pageObjects.indexManagement.clickNextButton();

    await expect(page.testSubj.locator('saveTemplateError')).toBeVisible();

    await page.testSubj.locator('stepReviewPreviewTab').click();
    await expect(page.testSubj.locator('simulateTemplatePreview')).toContainText(
      '_source can not be disabled in index using [logsdb] index mode'
    );
  });
});
