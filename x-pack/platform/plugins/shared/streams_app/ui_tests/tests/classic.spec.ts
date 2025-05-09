/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect } from '@kbn/scout';

test.describe('Classic Streams', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ esClient, browserAuth, pageObjects }) => {
    await esClient.index({
      index: 'logs-test-default',
      document: {
        '@timestamp': '2025-05-01T00:00:00.000Z',
        message: 'GET /search HTTP/1.1 200 1070000',
        'agent.name': 'nginx',
      },
      refresh: 'wait_for',
    });
    // await apiServices.streams.enable();
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test('full flow', async ({ page, esClient, pageObjects }) => {
    // Update "logs-classic-test" data retention
    await pageObjects.streams.gotoDataRetentionTab('logs-test-default');

    await page.getByRole('button', { name: 'Edit data retention' }).click();
    await page.getByRole('button', { name: 'Set specific retention days' }).click();
    await page.getByTestId('streamsAppDslModalDaysField').fill('7');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByTestId('streamsAppRetentionMetadataRetentionPeriod').getByText('7d')
    ).toBeVisible();

    // Update "logs-test-default" processing
    await pageObjects.streams.gotoExtractFieldTab('logs-test-default');
    await page.getByText('Add a processor').click();

    await page.locator('input[name="field"]').fill('message');
    await page
      .locator('input[name="patterns\\.0\\.value"]')
      .fill('%{WORD:method} %{URIPATH:request}');
    await page.getByRole('button', { name: 'Add processor' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText("Stream's processors updated")).toBeVisible();

    // // Update "logs-test-default" mapping
    // await pageObjects.streams.gotoSchemaEditorTab('logs-test-default');

    // await page
    //   .getByRole('row', { name: 'agent.name ----- ----- logs.' })
    //   .getByLabel('Open actions menu')
    //   .click();
    // await page
    //   .getByRole('row', { name: 'agent.name ----- ----- logs.' })
    //   .getByLabel('Open actions menu')
    //   .click();
    // await page.getByRole('button', { name: 'Map field' }).click();
    // await page.getByRole('combobox').selectOption('keyword');
    // await page.getByRole('button', { name: 'Save changes' }).click();
    // await page.getByRole('heading', { name: 'agent.name' }).waitFor({ state: 'hidden' });

    // await expect(page.getByText('Mapped', { exact: true })).toBeVisible();
  });
});
