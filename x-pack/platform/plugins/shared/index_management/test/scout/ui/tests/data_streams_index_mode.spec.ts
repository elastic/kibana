/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const TEST_DS_STANDARD = 'test-ds-index-mode-standard';
const TEST_DS_LOGSDB = 'test-ds-index-mode-logsdb';
const TEST_DS_MODIFY = 'test-ds-index-mode-modify';

test.describe('Data streams - index mode', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    for (const dsName of [TEST_DS_STANDARD, TEST_DS_LOGSDB]) {
      const mode = dsName.includes('logsdb') ? 'logsdb' : undefined;
      await esClient.indices.putIndexTemplate({
        name: `${dsName}_template`,
        index_patterns: [dsName],
        data_stream: {},
        template: {
          settings: { mode },
          mappings: { properties: { '@timestamp': { type: 'date' } } },
          lifecycle: { enabled: true },
        },
      });
      await esClient.indices.createDataStream({ name: dsName });
    }
  });

  test.afterAll(async ({ esClient }) => {
    for (const dsName of [TEST_DS_STANDARD, TEST_DS_LOGSDB, TEST_DS_MODIFY]) {
      try {
        await esClient.indices.deleteDataStream({ name: dsName });
        await esClient.indices.deleteIndexTemplate({ name: `${dsName}_template` });
      } catch (_) {
        // ignore
      }
    }
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
  });

  test('shows Standard index mode in the details flyout', async ({ pageObjects, page }) => {
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_STANDARD);
    await expect(page.testSubj.locator('indexModeDetail')).toBeVisible();
    await expect(page.testSubj.locator('indexModeDetail')).toHaveText('Standard');
    await page.testSubj.locator('closeDetailsButton').click();
  });

  test('shows LogsDB index mode in the details flyout', async ({ pageObjects, page }) => {
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_LOGSDB);
    await expect(page.testSubj.locator('indexModeDetail')).toBeVisible();
    await expect(page.testSubj.locator('indexModeDetail')).toHaveText('LogsDB');
    await page.testSubj.locator('closeDetailsButton').click();
  });

  test('allows upgrading data stream from standard to LogsDB index mode', async ({
    esClient,
    pageObjects,
    page,
  }) => {
    // Setup: create standard data stream
    await esClient.indices.putIndexTemplate({
      name: `${TEST_DS_MODIFY}_template`,
      index_patterns: [TEST_DS_MODIFY],
      data_stream: {},
      template: { settings: { mode: 'standard' } },
    });
    await esClient.indices.createDataStream({ name: TEST_DS_MODIFY });
    await page.testSubj.locator('reloadButton').click();

    // Verify current mode in flyout
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_MODIFY);
    await expect(page.testSubj.locator('indexModeDetail')).toHaveText('Standard');
    await page.testSubj.locator('closeDetailsButton').click();

    // Edit template to change index mode
    await pageObjects.indexManagement.changeTabs('templatesTab');
    await pageObjects.indexManagement.clickIndexTemplateNameLink(`${TEST_DS_MODIFY}_template`);
    await page.testSubj.locator('manageTemplateButton').click();
    await page.testSubj.locator('editIndexTemplateButton').click();

    await expect(page.testSubj.locator('indexModeField')).toHaveText('Standard');
    await page.testSubj.locator('indexModeField').click();
    await page.testSubj.locator('index_mode_logsdb').click();

    // Navigate to review step and save
    await page.testSubj.locator('formWizardStep-5').click();
    await expect(page.testSubj.locator('indexModeValue')).toHaveText('LogsDB');
    await pageObjects.indexManagement.clickNextButton();

    // Rollover to apply new mode
    await esClient.indices.rollover({ alias: TEST_DS_MODIFY });

    // Verify mode changed in data stream
    await pageObjects.indexManagement.changeTabs('data_streamsTab');
    await page.testSubj.locator('reloadButton').click();
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_MODIFY);
    await expect(page.testSubj.locator('indexModeDetail')).toHaveText('LogsDB');
    await page.testSubj.locator('closeDetailsButton').click();

    // Cleanup
    await esClient.indices.deleteDataStream({ name: TEST_DS_MODIFY });
    await esClient.indices.deleteIndexTemplate({ name: `${TEST_DS_MODIFY}_template` });
  });

  test('allows downgrading data stream from LogsDB to standard index mode', async ({
    esClient,
    pageObjects,
    page,
  }) => {
    // Setup: create logsdb data stream
    await esClient.indices.putIndexTemplate({
      name: `${TEST_DS_MODIFY}_template`,
      index_patterns: [TEST_DS_MODIFY],
      data_stream: {},
      template: { settings: { mode: 'logsdb' } },
    });
    await esClient.indices.createDataStream({ name: TEST_DS_MODIFY });
    await page.testSubj.locator('reloadButton').click();

    // Verify current mode in flyout
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_MODIFY);
    await expect(page.testSubj.locator('indexModeDetail')).toHaveText('LogsDB');
    await page.testSubj.locator('closeDetailsButton').click();

    // Edit template to change index mode
    await pageObjects.indexManagement.changeTabs('templatesTab');
    await pageObjects.indexManagement.clickIndexTemplateNameLink(`${TEST_DS_MODIFY}_template`);
    await page.testSubj.locator('manageTemplateButton').click();
    await page.testSubj.locator('editIndexTemplateButton').click();

    await expect(page.testSubj.locator('indexModeField')).toHaveText('LogsDB');
    await page.testSubj.locator('indexModeField').click();
    await page.testSubj.locator('index_mode_standard').click();

    // Navigate to review step and save
    await page.testSubj.locator('formWizardStep-5').click();
    await expect(page.testSubj.locator('indexModeValue')).toHaveText('Standard');
    await pageObjects.indexManagement.clickNextButton();

    // Rollover to apply new mode
    await esClient.indices.rollover({ alias: TEST_DS_MODIFY });

    // Verify mode changed in data stream
    await pageObjects.indexManagement.changeTabs('data_streamsTab');
    await page.testSubj.locator('reloadButton').click();
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_MODIFY);
    await expect(page.testSubj.locator('indexModeDetail')).toHaveText('Standard');
    await page.testSubj.locator('closeDetailsButton').click();

    // Cleanup
    await esClient.indices.deleteDataStream({ name: TEST_DS_MODIFY });
    await esClient.indices.deleteIndexTemplate({ name: `${TEST_DS_MODIFY}_template` });
  });
});
