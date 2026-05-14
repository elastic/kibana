/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const INDEX_TEMPLATE_NAME = 'index-template-test-name';

test.describe('Index templates tab', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE_NAME }, { ignore: [404] });
  });

  test.describe('index template creation', () => {
    test.beforeEach(async ({ page }) => {
      if (await page.testSubj.locator('closeDetailsButton').isVisible()) {
        await page.testSubj.locator('closeDetailsButton').click();
      }
      await page.testSubj.locator('createTemplateButton').click();
      await page.testSubj.fill('nameField', INDEX_TEMPLATE_NAME);
      await page.testSubj.fill('indexPatternsField', 'test-1');
    });

    test.afterEach(async ({ pageObjects, page }) => {
      // Advance past any wizard step (skip to review) to stay on template list
      if (await page.testSubj.locator('nextButton').isVisible()) {
        await pageObjects.indexManagement.clickNextButton();
      }
      if (await page.testSubj.locator('closeDetailsButton').isVisible()) {
        await page.testSubj.locator('closeDetailsButton').click();
      }
    });

    test('can create an index template with data retention', async ({ page }) => {
      await page.testSubj.locator('dataRetentionToggle').locator('input').click();
      await page.testSubj.fill('valueDataRetentionField', '7');
      await page.testSubj.locator('show-filters-button').click();
      await page.testSubj.locator('filter-option-h').click();

      // Navigate to review step
      await page.testSubj.locator('formWizardStep-5').click();

      await expect(page.testSubj.locator('lifecycleValue')).toHaveText('7 hours');
    });

    test('can create an index template with LogsDB index mode', async ({ page }) => {
      await page.testSubj.locator('indexModeField').click();
      await page.testSubj.locator('index_mode_logsdb').click();

      // Navigate to review step
      await page.testSubj.locator('formWizardStep-5').click();

      await expect(page.testSubj.locator('indexModeTitle')).toBeVisible();
      await expect(page.testSubj.locator('indexModeValue')).toHaveText('LogsDB');
    });
  });

  test.describe('index template modification', { tag: '@skipFIPS' }, () => {
    test.beforeEach(async ({ esClient, page }) => {
      if (await page.testSubj.locator('closeDetailsButton').isVisible()) {
        await page.testSubj.locator('closeDetailsButton').click();
      }
      await esClient.indices.putIndexTemplate({
        name: INDEX_TEMPLATE_NAME,
        index_patterns: ['logsdb-test-index-pattern'],
        data_stream: {},
        template: { settings: { index: { mode: 'logsdb' } } },
      });
      await page.testSubj.locator('reloadButton').click();

      if (await page.testSubj.locator('closeDetailsButton').isVisible()) {
        await page.testSubj.locator('closeDetailsButton').click();
      }
      await expect
        .poll(async () => page.testSubj.locator(`templateDetailsLink-${INDEX_TEMPLATE_NAME}`).isVisible())
        .toBe(true);
      await page.testSubj.locator(`templateDetailsLink-${INDEX_TEMPLATE_NAME}`).click();
      await page.testSubj.locator('manageTemplateButton').click();
      await page.testSubj.locator('editIndexTemplateButton').click();
    });

    test.afterEach(async ({ pageObjects, page }) => {
      if (await page.testSubj.locator('closeDetailsButton').isVisible()) {
        await page.testSubj.locator('closeDetailsButton').click();
      } else {
        await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
      }
    });

    test('can modify ignore_above and synthetic source in LogsDB template', async ({ page }) => {
      await page.testSubj.locator('formWizardStep-2').click();

      await page.testSubj.locator('kibanaCodeEditor').fill(
        JSON.stringify({
          index: {
            mapping: {
              ignore_above: '20',
              total_fields: { ignore_dynamic_beyond_limit: 'true' },
              ignore_malformed: 'true',
            },
          },
        })
      );

      await page.testSubj.locator('formWizardStep-3').click();
      await page.testSubj.locator('advancedOptionsTab').click();

      await page.testSubj.locator('comboBoxClearButton').click();
      await page.testSubj.fill('comboBoxInput', 'basic_date');
      await page.keyboard.press('Enter');

      await page.testSubj.locator('subobjectsToggle').click();

      await page.testSubj.locator('formWizardStep-5').click();
      await page.testSubj.locator('nextButton').click();

      await page.testSubj.locator('settingsTabBtn').click();
      const settingsText = await page.testSubj.locator('settingsTabContent').textContent();
      expect(JSON.parse(settingsText!)).toEqual({
        index: {
          mode: 'logsdb',
          mapping: {
            ignore_above: '20',
            source: { mode: 'synthetic' },
            total_fields: { ignore_dynamic_beyond_limit: 'true' },
            ignore_malformed: 'true',
          },
        },
      });

      await page.testSubj.locator('mappingsTabBtn').click();
      const mappingsText = await page.testSubj.locator('mappingsTabContent').textContent();
      expect(JSON.parse(mappingsText!)).toEqual({
        dynamic_date_formats: ['basic_date'],
        subobjects: false,
      });
    });

    test('cannot disable synthetic source in a LogsDB template', async ({ page }) => {
      await page.testSubj.locator('formWizardStep-3').click();
      await page.testSubj.locator('advancedOptionsTab').click();

      await page.testSubj.locator('sourceValueField').click();
      await page.testSubj.locator('disabledSourceFieldOption').click();

      await page.testSubj.locator('formWizardStep-5').click();
      await page.testSubj.locator('nextButton').click();

      await expect(page.testSubj.locator('saveTemplateError')).toBeVisible();
      await page.testSubj.locator('stepReviewPreviewTab').click();
      const previewText = await page.testSubj.locator('simulateTemplatePreview').textContent();
      expect(previewText).toContain('_source can not be disabled in index using [logsdb] index mode');
    });
  });

  test.describe('index template list', () => {
    test('shows warning callout when deleting a managed index template', async ({ page }) => {
      await page.testSubj.locator('templateDetailsLink-ilm-history-7').click();
      await page.testSubj.locator('manageTemplateButton').click();
      await page.testSubj.locator('deleteIndexTemplateButton').click();

      await expect(page.testSubj.locator('deleteManagedAssetsCallout')).toBeVisible();

      // Close modal without deleting
      await page.keyboard.press('Escape');
    });

    test('shows link to ingest pipeline when default_pipeline is set on template', async ({
      esClient,
      page,
    }) => {
      const TEST_TEMPLATE = `a_test_template_${Math.random().toString(36).slice(2)}`;
      const INDEX_PATTERN = `index_pattern_${Math.random().toString(36).slice(2)}`;

      await esClient.indices.putIndexTemplate({
        name: TEST_TEMPLATE,
        index_patterns: [INDEX_PATTERN],
        template: { settings: { default_pipeline: 'test_pipeline' } },
      });

      try {
        await page.testSubj.locator('reloadButton').click();
        await page.testSubj.locator(`templateDetailsLink-${TEST_TEMPLATE}`).click();

        await page.testSubj.locator('linkedIngestPipeline').click();

        expect(page.url()).toContain('/ingest/ingest_pipelines/edit/test_pipeline');
      } finally {
        await esClient.indices.deleteIndexTemplate({ name: TEST_TEMPLATE }, { ignore: [404] });
      }
    });
  });
});
