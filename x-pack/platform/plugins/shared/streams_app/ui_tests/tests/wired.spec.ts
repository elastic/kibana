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
    await page.getByPlaceholder('Field').fill('agent.name');
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
        message: JSON.stringify({
          'log.level': 'info',
          'log.logger': 'nginx',
          message: 'GET /search HTTP/1.1 200 1070000',
        }),
        'agent.name': 'nginx',
        'other.field': 'important',
      },
      refresh: 'wait_for',
    });

    await pageObjects.streams.gotoExtractFieldTab('logs.nginx');
    await page.getByText('Add a processor').click();

    await page.locator('input[name="field"]').fill('message');
    await page
      .locator('input[name="patterns\\.0\\.value"]')
      .fill('%{WORD:method} %{URIPATH:request}');
    await page.getByRole('button', { name: 'Add processor' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText("Stream's processors updated")).toBeVisible();
    await page.getByTestId('toastCloseButton').click();

    // Update "logs.nginx" mapping
    await pageObjects.streams.gotoSchemaEditorTab('logs.nginx');

    await page
      .getByRole('row', { name: 'agent.name ----- ----- logs.' })
      .getByLabel('Open actions menu')
      .click();
    await page
      .getByRole('row', { name: 'agent.name ----- ----- logs.' })
      .getByLabel('Open actions menu')
      .click();
    await page.getByRole('button', { name: 'Map field' }).click();
    await page.getByRole('combobox').selectOption('keyword');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('heading', { name: 'agent.name' }).waitFor({ state: 'hidden' });

    await expect(page.getByText('Mapped', { exact: true })).toBeVisible();
    await page.getByTestId('toastCloseButton').click();

    // Add dashboard
    await pageObjects.streams.gotoStreamDashboard('logs.nginx');
    await page.getByRole('button', { name: 'Add a dashboard' }).click();
    await expect(
      page
        .getByTestId('streamsAppAddDashboardFlyoutDashboardsTable')
        .getByRole('button', { name: 'Some Dashboard' })
    ).toBeVisible();
    // eslint-disable-next-line playwright/no-nth-methods
    await page.getByRole('cell', { name: 'Select row' }).locator('div').first().click();
    await page.getByRole('button', { name: 'Add dashboard' }).click();
    await expect(
      page
        .getByTestId('streamsAppStreamDetailDashboardsTable')
        .getByTestId('streamsAppDashboardColumnsLink')
    ).toHaveText('Some Dashboard');

    // remove dashboard
    await page
      .getByTestId('streamsAppStreamDetailDashboardsTable')
      .getByRole('cell', { name: 'Select row' })
      .locator('div')
      // eslint-disable-next-line playwright/no-nth-methods
      .first()
      .click();

    await page.getByRole('button', { name: 'Unlink selected' }).click();
    await expect(
      page.getByTestId('streamsAppStreamDetailDashboardsTable').getByText('No items found')
    ).toBeVisible();
  });
});
