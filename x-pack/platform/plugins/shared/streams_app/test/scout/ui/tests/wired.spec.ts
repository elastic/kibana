/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { testData, test } from '../fixtures';

test.describe('Wired Streams', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ apiServices, kbnClient, browserAuth, pageObjects }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD);
    await apiServices.streams.enable();
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.goto();
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await apiServices.streams.disable();
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('full flow', async ({ page, esClient, pageObjects }) => {
    await pageObjects.streams.gotoCreateChildStream('logs');

    await page.getByLabel('Stream name').fill('logs.nginx');
    await page.getByPlaceholder('Field').fill('attributes.custom_field');
    await page.getByPlaceholder('Value').fill('nginx');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('link', { name: 'logs.nginx', exact: true })).toBeVisible();
    await page.getByTestId('toastCloseButton').click();

    // Update "logs.nginx" data retention
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
    await page.getByRole('button', { name: 'Edit data retention' }).click();
    await page.getByRole('button', { name: 'Set specific retention days' }).click();
    await page.getByTestId('streamsAppDslModalDaysField').fill('7');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByTestId('streamsAppRetentionMetadataRetentionPeriod').getByText('7d')
    ).toBeVisible();
    await page.getByTestId('toastCloseButton').click();

    // Update "logs.nginx" processing
    await esClient.index({
      index: 'logs',
      document: {
        '@timestamp': '2025-05-01T00:00:00.000Z',
        'log.level': 'warn',
        message: 'GET /search HTTP/1.1 200 1070000',
        custom_field: 'nginx',
      },
      refresh: 'wait_for',
    });

    await pageObjects.streams.gotoProcessingTab('logs.nginx');
    await page.getByText('Add a processor').click();

    await page.locator('input[name="field"]').fill('body.text');
    await page.getByTestId('streamsAppPatternExpression').click();
    await page.keyboard.type('%{WORD:attributes.method}', { delay: 150 }); // Simulate real typing
    await page.getByRole('button', { name: 'Add processor' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText("Stream's processors updated")).toBeVisible();
    await page.getByTestId('toastCloseButton').click();

    // Update "logs.nginx" mapping
    await pageObjects.streams.gotoSchemaEditorTab('logs.nginx');
    await page.getByPlaceholder('Search...').fill('attributes');
    await page.getByTestId('streamsAppContentRefreshButton').click();

    await expect(page.getByTestId('streamsAppSchemaEditorFieldsTableLoaded')).toBeVisible();
    await page
      .getByRole('row', { name: 'attributes.custom_field' })
      .getByTestId('streamsAppActionsButton')
      .click();
    await page.getByRole('button', { name: 'Map field' }).click();
    await page.getByRole('combobox').selectOption('keyword');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('heading', { name: 'logs.foo' }).waitFor({ state: 'hidden' });

    await expect(page.getByText('Mapped', { exact: true })).toBeVisible();
    await page.getByTestId('toastCloseButton').click();
  });
});
