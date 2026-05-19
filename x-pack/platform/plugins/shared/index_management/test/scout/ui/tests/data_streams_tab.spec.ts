/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const TEST_DS_NAME_1 = 'test-ds-1';
const TEST_DS_NAME_2 = 'test-ds-2';
const TEST_DATA_STREAM_NAMES = [TEST_DS_NAME_1, TEST_DS_NAME_2];

test.describe('Data streams tab', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient, log }) => {
    await log.debug('Creating required data streams');
    for (const dataStreamName of TEST_DATA_STREAM_NAMES) {
      await esClient.indices.putIndexTemplate({
        name: `${dataStreamName}_index_template`,
        index_patterns: [dataStreamName],
        data_stream: {},
        _meta: { description: `Template for ${dataStreamName} testing` },
        template: {
          settings: { mode: undefined },
          mappings: {
            properties: { '@timestamp': { type: 'date' } },
          },
          lifecycle: { enabled: true },
        },
      });
      await esClient.indices.createDataStream({ name: dataStreamName });
    }
  });

  test.afterAll(async ({ esClient, log }) => {
    await log.debug('Cleaning up created data streams');
    for (const dataStreamName of TEST_DATA_STREAM_NAMES) {
      try {
        await esClient.indices.deleteDataStream({ name: dataStreamName });
        await esClient.indices.deleteIndexTemplate({ name: `${dataStreamName}_index_template` });
      } catch (e: any) {
        log.debug(`[Teardown error] ${e.message}`);
      }
    }
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
  });

  test('shows the details flyout when clicking on a data stream name', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
    expect(page.url()).toContain(`/data_streams/${TEST_DS_NAME_1}`);
    await expect(page.testSubj.locator('dataStreamDetailPanel')).toBeVisible();
    await page.testSubj.locator('closeDetailsButton').click();
  });

  test.describe('data retention modal - from details panel', () => {
    test('allows updating data retention', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
      await page.testSubj.locator('manageDataStreamButton').click();
      await page.testSubj.locator('editDataRetentionButton').click();

      await page.testSubj.locator('infiniteRetentionPeriod').locator('input').click();
      await page.testSubj.fill('dataRetentionValue', '7');
      await page.testSubj.locator('show-filters-button').click();
      await page.testSubj.locator('filter-option-h').click();

      await page.testSubj.locator('saveButton').click();

      await expect(
        page.testSubj.locator('euiToastHeader__title').filter({ hasText: 'Data retention updated' })
      ).toBeVisible({ timeout: 15000 });
    });

    test('allows disabling data retention', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
      await page.testSubj.locator('manageDataStreamButton').click();
      await page.testSubj.locator('editDataRetentionButton').click();

      await page.testSubj.locator('dataRetentionEnabledField').locator('input').click();
      await page.testSubj.locator('saveButton').click();

      await expect(
        page.testSubj.locator('euiToastHeader__title').filter({ hasText: 'Data retention disabled' })
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('data retention modal - bulk edit', () => {
    test('allows bulk-updating data retention', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.clickBulkEditDataRetention(TEST_DATA_STREAM_NAMES);

      await page.testSubj.fill('dataRetentionValue', '7');
      await page.testSubj.locator('show-filters-button').click();
      await page.testSubj.locator('filter-option-h').click();

      await page.testSubj.locator('saveButton').click();

      await expect(page.testSubj.locator('editDataRetentionModal')).toBeHidden({ timeout: 15000 });
      await expect(
        page.testSubj
          .locator('euiToastHeader')
          .filter({ hasText: 'Data retention has been updated for 2 data streams.' })
      ).toBeVisible({ timeout: 15000 });
    });

    test('allows bulk-disabling data retention', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.clickBulkEditDataRetention(TEST_DATA_STREAM_NAMES);

      await page.testSubj.locator('dataRetentionEnabledField').locator('input').click();
      await page.testSubj.locator('saveButton').click();

      await expect(page.testSubj.locator('editDataRetentionModal')).toBeHidden({ timeout: 15000 });
      await expect(
        page.testSubj
          .locator('euiToastHeader')
          .filter({ hasText: 'Data retention has been updated for 2 data streams.' })
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('failure store modal', () => {
    test('allows configuring failure store from details panel', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
      await page.testSubj.locator('manageDataStreamButton').click();
      await page.testSubj.locator('configureFailureStoreButton').click();

      await expect(page.testSubj.locator('editFailureStoreModal')).toBeVisible();
      await page.testSubj.locator('enableFailureStoreToggle').click();
      await page.testSubj.locator('failureStoreModalSaveButton').click();

      await expect(
        page.testSubj.locator('euiToastHeader__title').filter({ hasText: 'Failure store enabled' })
      ).toBeVisible({ timeout: 15000 });
    });

    test('allows disabling failure store from details panel', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
      await page.testSubj.locator('manageDataStreamButton').click();
      await page.testSubj.locator('configureFailureStoreButton').click();

      await expect(page.testSubj.locator('editFailureStoreModal')).toBeVisible();
      await page.testSubj.locator('enableFailureStoreToggle').click();
      await page.testSubj.locator('failureStoreModalSaveButton').click();

      await expect(
        page.testSubj.locator('euiToastHeader__title').filter({ hasText: 'Failure store disabled' })
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
