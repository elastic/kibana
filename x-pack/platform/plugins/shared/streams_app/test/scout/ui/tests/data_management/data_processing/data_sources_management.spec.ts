/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data processing - data sources management',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing processors before each test
      await apiServices.streams.clearStreamProcessors('logs-generic-default');

      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await logsSynthtraceEsClient.clean();
    });

    test('should load by default a random samples data source', async ({ pageObjects }) => {
      await expect(pageObjects.streams.getDataSourcesList()).toBeVisible();
      const dataSources = pageObjects.streams.getDataSourcesListItems();
      await expect(dataSources).toHaveCount(1);
      const dataSourceItem = dataSources.first();
      await expect(dataSourceItem).toBeVisible();
      await expect(dataSourceItem.getByRole('checkbox')).toBeChecked();
      await expect(dataSourceItem.getByText('Random samples')).toBeVisible();
    });

    test('should allow adding a new kql data source', async ({ page, pageObjects }) => {
      // First disable default random samples data source
      await pageObjects.streams.getDataSourcesList().getByText('Random samples').click();

      await pageObjects.streams.clickManageDataSourcesButton();
      await pageObjects.streams.addDataSource('kql');
      await page.getByRole('textbox', { name: 'Name' }).fill('Kql Samples');
      await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);
      await page.getByTestId('unifiedQueryInput').getByRole('textbox').fill('log.level: warn');
      await page.getByTestId('querySubmitButton').click();

      // Assert that the custom samples are correctly displayed in the preview
      await pageObjects.streams.closeFlyout();
      const rows = await pageObjects.streams.getPreviewTableRows();
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        await pageObjects.streams.expectCellValueContains({
          columnName: 'log.level',
          rowIndex,
          value: 'warn',
        });
      }
    });

    test('should allow adding a new custom data source', async ({ page, pageObjects }) => {
      // First disable default random samples data source
      await pageObjects.streams.getDataSourcesList().getByText('Random samples').click();

      await pageObjects.streams.clickManageDataSourcesButton();
      await pageObjects.streams.addDataSource('custom');
      await page.getByRole('textbox', { name: 'Name' }).fill('Custom Samples');
      await pageObjects.streams.fillCustomSamplesEditor(
        '[{"@timestamp": "2023-01-01T00:00:00.000Z", "message": "Sample log 1"}]'
      );

      // Assert that the custom samples are correctly displayed in the preview
      await pageObjects.streams.closeFlyout();
      await expect(await pageObjects.streams.getDataSourcesListItems()).toHaveCount(2);
      expect(await pageObjects.streams.getPreviewTableRows()).toHaveLength(1);
    });

    test('should persist existing data sources on page reload, except for custom samples', async ({
      page,
      pageObjects,
    }) => {
      // Create a new data source
      await pageObjects.streams.clickManageDataSourcesButton();
      await pageObjects.streams.addDataSource('kql');
      await page.getByRole('textbox', { name: 'Name' }).fill('Kql Samples');

      await page.reload();

      // Assert that the data sources are still present
      await expect(await pageObjects.streams.getDataSourcesListItems()).toHaveCount(2);
      await expect(
        pageObjects.streams.getDataSourcesList().getByText('Random samples')
      ).toBeVisible();
      await expect(pageObjects.streams.getDataSourcesList().getByText('Kql Samples')).toBeVisible();
    });
  }
);
