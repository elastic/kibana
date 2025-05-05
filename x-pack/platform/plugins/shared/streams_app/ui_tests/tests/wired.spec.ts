/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test, expect } from '@kbn/scout';

test.describe('Wired Streams', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await apiServices.streams.enable();
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test('full flow', async ({ page, esClient }) => {
    await page.getByRole('link', { name: 'logs', exact: true }).click();
    await page.getByRole('link', { name: 'Manage stream' }).click();
    await page.getByRole('button', { name: 'Create child stream' }).click();

    await page.getByLabel('Stream name').fill('logs.nginx');
    await page.getByPlaceholder('Field').fill('agent.name');
    await page.getByPlaceholder('Value').fill('nginx');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByRole('link', { name: 'logs.nginx' }).click();

    // Update "logs.nginx" data retention
    await page.getByRole('tab', { name: 'Data retention' }).click();
    await page.getByRole('button', { name: 'Edit data retention' }).click();
    await page.getByRole('button', { name: 'Set specific retention days' }).click();
    await page.getByTestId('streamsAppDslModalDaysField').fill('7');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTitle('7d', { exact: true })).toBeVisible();

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

    await page.getByRole('tab', { name: 'Extract field' }).click();
    await page.getByText('Add a processor').click();

    await page.locator('input[name="field"]').fill('message');
    await page
      .locator('input[name="patterns\\.0\\.value"]')
      .fill('%{WORD:method} %{URIPATH:request}');
    await page.getByRole('button', { name: 'Add processor' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText("Stream's processors updated")).toBeVisible();

    // Update "logs.nginx" mapping
    await page.getByRole('tab', { name: 'Schema editor' }).click();

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
  });
});
