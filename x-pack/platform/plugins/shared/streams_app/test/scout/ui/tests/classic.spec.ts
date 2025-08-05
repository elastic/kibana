/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { testData, test } from '../fixtures';

const DATA_STREAM_NAME = 'my-data-stream';

test.describe('Classic Streams', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ kbnClient, esClient, browserAuth, pageObjects }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD);
    await esClient.indices.putIndexTemplate({
      name: 'my-index-template',
      index_patterns: [`${DATA_STREAM_NAME}*`],
      data_stream: {},
      priority: 500,
      template: {
        lifecycle: {
          data_retention: '7d',
        },
      },
    });

    await esClient.indices.createDataStream({
      name: DATA_STREAM_NAME,
    });

    await esClient.index({
      index: DATA_STREAM_NAME,
      document: {
        '@timestamp': '2025-05-01T00:00:00.000Z',
        message: 'GET /search HTTP/1.1 200 1070000',
        'agent.name': 'nginx',
      },
      refresh: 'wait_for',
    });
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.goto();
  });

  test.afterAll(async ({ kbnClient, esClient, apiServices }) => {
    await esClient.indices.deleteDataStream({ name: DATA_STREAM_NAME });
    await esClient.indices.deleteIndexTemplate({
      name: 'my-index-template',
    });
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('full flow', async ({ page, esClient, pageObjects }) => {
    // Update data retention
    await pageObjects.streams.gotoDataRetentionTab(DATA_STREAM_NAME);

    await page.getByRole('button', { name: 'Edit data retention' }).click();
    await page.getByRole('button', { name: 'Set specific retention days' }).click();
    await page.getByTestId('streamsAppDslModalDaysField').fill('30');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByTestId('streamsAppRetentionMetadataRetentionPeriod').getByText('30d')
    ).toBeVisible();
    await page.getByTestId('toastCloseButton').click();

    // Update field extraction
    await pageObjects.streams.gotoProcessingTab(DATA_STREAM_NAME);
    await page.getByText('Add a processor').click();

    await page.locator('input[name="field"]').fill('body.text');
    await page.getByTestId('streamsAppPatternExpression').click();
    await page.keyboard.type('%{WORD:attributes.method}', { delay: 150 }); // Simulate real typing
    await page.getByRole('button', { name: 'Add processor' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText("Stream's processors updated")).toBeVisible();
    await page.getByTestId('toastCloseButton').click();
  });
});
