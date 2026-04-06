/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { CONNECTORS_API, CONNECTORS_WITH_ONE } from '../fixtures/mock_data';

// The flyout fetches indices for the "Select index" card
const INDICES_API = '**/api/index_management/indices**';

test.describe(
  'Add Integration — Automatic Import V2 — Create Data Stream Flyout',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await page.route(CONNECTORS_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CONNECTORS_WITH_ONE),
        })
      );

      await page.route(INDICES_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      );

      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.integrationManagement.navigateToCreate();

      await pageObjects.integrationManagement
        .getIntegrationTitleInput()
        .fill('Test Integration Title');
      await pageObjects.integrationManagement
        .getIntegrationDescriptionInput()
        .fill('Test Integration Description');

      await pageObjects.integrationManagement.openCreateDataStreamFlyout();
    });

    test('opens the create data stream flyout when Add data stream is clicked', async ({
      pageObjects,
    }) => {
      await expect(pageObjects.integrationManagement.getCreateDataStreamFlyout()).toBeVisible();
    });

    test('closes the flyout when the cancel button is clicked', async ({ pageObjects }) => {
      await pageObjects.integrationManagement.getCancelDataStreamButton().click();
      await expect(pageObjects.integrationManagement.getCreateDataStreamFlyout()).toBeHidden();
    });

    test('Analyze Logs button is disabled when the form is empty', async ({ pageObjects }) => {
      await expect(pageObjects.integrationManagement.getAnalyzeLogsButton()).toBeDisabled();
    });

    test('shows the file upload card as the default log source', async ({ pageObjects }) => {
      await expect(pageObjects.integrationManagement.getLogsSourceUploadCard()).toBeVisible();

      await expect(
        pageObjects.integrationManagement.getIndexSelect().locator('input')
      ).toBeDisabled();
    });

    test('enables the index selector when the Select index card is clicked', async ({
      pageObjects,
    }) => {
      await pageObjects.integrationManagement.getLogsSourceIndexCard().click();
      await expect(
        pageObjects.integrationManagement.getIndexSelect().locator('input')
      ).toBeEnabled();
    });

    test('disables the index selector when toggling back to the upload card', async ({
      pageObjects,
    }) => {
      await pageObjects.integrationManagement.getLogsSourceIndexCard().click();
      await expect(
        pageObjects.integrationManagement.getIndexSelect().locator('input')
      ).toBeEnabled();

      await pageObjects.integrationManagement.getLogsSourceUploadCard().click();
      await expect(
        pageObjects.integrationManagement.getIndexSelect().locator('input')
      ).toBeDisabled();
    });

    test('Analyze Logs button is enabled when all required fields are filled', async ({
      pageObjects,
    }) => {
      const flyout = pageObjects.integrationManagement.getCreateDataStreamFlyout();

      await pageObjects.integrationManagement
        .getDataStreamTitleInput()
        .fill('Audit Logs Data Stream');

      const comboInput = pageObjects.integrationManagement
        .getDataCollectionMethodSelect()
        .locator('input');
      await comboInput.click();
      await comboInput.press('ArrowDown');
      await comboInput.press('Enter');

      const fileInput = flyout.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'sample.log',
        mimeType: 'text/plain',
        buffer: Buffer.from('2024-01-01T00:00:00Z level=info msg="sample log line"\n'),
      });

      await expect(pageObjects.integrationManagement.getAnalyzeLogsButton()).toBeEnabled();
    });

    test('Analyze Logs button stays disabled when data stream title is empty', async ({
      pageObjects,
    }) => {
      const flyout = pageObjects.integrationManagement.getCreateDataStreamFlyout();

      const comboInput = pageObjects.integrationManagement
        .getDataCollectionMethodSelect()
        .locator('input');
      await comboInput.click();
      await comboInput.press('ArrowDown');
      await comboInput.press('Enter');

      const fileInput = flyout.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'sample.log',
        mimeType: 'text/plain',
        buffer: Buffer.from('2024-01-01T00:00:00Z level=info msg="sample log line"\n'),
      });

      await expect(pageObjects.integrationManagement.getAnalyzeLogsButton()).toBeDisabled();
    });

    test('Analyze Logs calls the upload and create APIs then navigates to the edit page', async ({
      page,
      pageObjects,
    }) => {
      await page.route('**/api/automatic_import_v2/integrations/**/upload', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
      );
      await page.route('**/api/automatic_import_v2/integrations', (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ integration_id: 'new-integration-id' }),
          });
        } else {
          route.continue();
        }
      });

      const flyout = pageObjects.integrationManagement.getCreateDataStreamFlyout();

      await pageObjects.integrationManagement.getDataStreamTitleInput().fill('Audit Logs');

      const comboInput = pageObjects.integrationManagement
        .getDataCollectionMethodSelect()
        .locator('input');
      await comboInput.click();
      await comboInput.press('ArrowDown');
      await comboInput.press('Enter');

      const fileInput = flyout.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'sample.log',
        mimeType: 'text/plain',
        buffer: Buffer.from('2024-01-01T00:00:00Z level=info msg="sample log line"\n'),
      });

      await pageObjects.integrationManagement.getAnalyzeLogsButton().click();

      await expect(pageObjects.integrationManagement.getCreateDataStreamFlyout()).toBeHidden();
      await expect(page).toHaveURL(/\/edit\/new-integration-id/);
    });

    test('index selector shows available indices and allows selection', async ({
      page,
      pageObjects,
    }) => {
      await page.route(INDICES_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ name: 'my-logs-index' }, { name: 'my-metrics-index' }]),
        })
      );
      await pageObjects.integrationManagement.navigateToCreate();
      await pageObjects.integrationManagement
        .getIntegrationTitleInput()
        .fill('Test Integration Title');
      await pageObjects.integrationManagement
        .getIntegrationDescriptionInput()
        .fill('Test Integration Description');
      await pageObjects.integrationManagement.openCreateDataStreamFlyout();
      await expect(pageObjects.integrationManagement.getCreateDataStreamFlyout()).toBeVisible();

      await pageObjects.integrationManagement.getLogsSourceIndexCard().click();

      const indexInput = pageObjects.integrationManagement.getIndexSelect().locator('input');
      await expect(indexInput).toBeEnabled();
      await indexInput.click();

      const option = page.getByRole('option', { name: 'my-logs-index' });
      await expect(option).toBeVisible();
      await option.click();

      await expect(indexInput).toHaveValue('my-logs-index');
    });
  }
);
