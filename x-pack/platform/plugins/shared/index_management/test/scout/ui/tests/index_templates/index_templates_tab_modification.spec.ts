/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags, KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const INDEX_TEMPLATE_NAME = 'index-template-test-name';

const readJsonTab = async (page: ScoutPage, testSubj: string) => {
  const text = await page.testSubj.locator(testSubj).innerText();
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
};

test.describe(
  'Index templates tab - template modification',
  { tag: tags.deploymentAgnostic },
  () => {
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

    test('can modify ignore_above, ignore_malformed, ignore_dynamic_beyond_limit, subobjects and timestamp format in an index template with logsdb index mode', async ({
      config,
      page,
      pageObjects,
    }) => {
      test.setTimeout(120_000);

      // Navigate to Index Settings and modify them
      await page.testSubj.locator('formWizardStep-2').click();
      await new KibanaCodeEditorWrapper(page).setCodeEditorValue(
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

      // Navigate to Mappings > Advanced options
      await page.testSubj.locator('formWizardStep-3').click();
      await page.testSubj.locator('advancedOptionsTab').click();

      // Clear the pre-populated default date formats, then add `basic_date`. The dynamic date
      // formats combo is the only combo box on this tab and has no test subject of its own.
      const clearButton = page.testSubj.locator('comboBoxClearButton');
      await clearButton.click();
      await expect(clearButton).toBeHidden();
      // The combo's test subject sits on a wrapper div, so drive the inner search input directly.
      const dateFormatsInput = page.testSubj
        .locator('comboBoxInput')
        .locator('[data-test-subj="comboBoxSearchInput"]');
      await dateFormatsInput.fill('basic_date');
      await dateFormatsInput.press('Enter');

      // Modify subobjects
      await page.testSubj.locator('subobjectsToggle').click();

      // Navigate to the last step of the wizard and save
      await page.testSubj.locator('formWizardStep-5').click();
      await pageObjects.indexManagement.clickNextButton();

      // Verify Index Settings
      await page.testSubj.locator('settingsTabBtn').click();
      await expect(page.testSubj.locator('settingsTabContent')).toBeVisible();
      expect(await readJsonTab(page, 'settingsTabContent')).toStrictEqual({
        index: {
          mode: 'logsdb',
          mapping: {
            ignore_above: '20',
            // Synthetic source is only persisted where the `_source` section is rendered, which
            // serverless hides (`enableMappingsSourceFieldSection: false`).
            ...(config.serverless ? {} : { source: { mode: 'synthetic' } }),
            total_fields: { ignore_dynamic_beyond_limit: 'true' },
            ignore_malformed: 'true',
          },
        },
      });

      // Verify Mappings
      await page.testSubj.locator('mappingsTabBtn').click();
      await expect(page.testSubj.locator('mappingsTabContent')).toBeVisible();
      expect(await readJsonTab(page, 'mappingsTabContent')).toStrictEqual({
        dynamic_date_formats: ['basic_date'],
        subobjects: false,
      });
    });
  }
);
