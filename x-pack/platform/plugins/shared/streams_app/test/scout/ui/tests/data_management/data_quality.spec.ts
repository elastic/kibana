/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';

test.describe('Stream data quality', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Create a test stream with routing rules first
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });

    await pageObjects.streams.gotoDataQualityTab('logs.nginx');
  });

  test.afterEach(async ({ apiServices }) => {
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs');
  });

  test('should show data quality metrics', async ({ page }) => {
    // Degraded and failed documents metrics should be visible
    await expect(
      page.getByTestId('datasetQualityDetailsSummaryKpiCard-Degraded documents')
    ).toBeVisible();
    await expect(
      page.getByTestId('datasetQualityDetailsSummaryKpiCard-Failed documents')
    ).toBeVisible();

    // Edit failure store button should not be visible for wired streams
    await page.getByTestId('datasetQualityDetailsSummaryKpiCard-Failed documents').click();
    await expect(page.getByTestId('datasetQualityDetailsEditFailureStore')).toBeVisible();

    // Quality issues table should be visible
    await expect(page.getByTestId('datasetQualityDetailsDegradedFieldTable')).toBeVisible();
  });

  test('date picker should show same time range as Streams Main page', async ({ pageObjects }) => {
    // Go to Main page
    await pageObjects.streams.gotoStreamMainPage();
    const mainTimeRange = {
      from: 'Sep 20, 2023 @ 00:00:00.000',
      to: 'Sep 20, 2023 @ 00:30:00.000',
    };
    // Change date picker
    await pageObjects.datePicker.setAbsoluteRange(mainTimeRange);

    // Go to Data Quality tab
    await pageObjects.streams.clickStreamNameLink('logs.nginx');
    await pageObjects.streams.clickDataQualityTab();
    await pageObjects.streams.verifyDatePickerTimeRange(mainTimeRange);
  });

  test('changing time range should also update date picker on Streams Main page', async ({
    pageObjects,
  }) => {
    const dataQualityTimeRange = {
      from: 'Sep 20, 2025 @ 00:00:00.000',
      to: 'Sep 20, 2025 @ 00:30:00.000',
    };
    // Change date picker
    await pageObjects.datePicker.setAbsoluteRange(dataQualityTimeRange);

    // Go to Streams main page
    await pageObjects.streams.clickRootBreadcrumb();
    await pageObjects.streams.verifyDatePickerTimeRange(dataQualityTimeRange);
  });

  test('should edit failure store for wired stream from data quality tab', async ({ page }) => {
    // Click on the Failed documents card to expand it
    await page.getByTestId('datasetQualityDetailsSummaryKpiCard-Failed documents').click();

    // Click the edit button to open the failure store modal
    await page.getByTestId('datasetQualityDetailsEditFailureStore').click();

    // Modal should be visible
    await expect(page.getByTestId('editFailureStoreModal')).toBeVisible();

    // Inherit failure store switch should be visible for wired streams
    await expect(page.getByTestId('inheritFailureStoreSwitch')).toBeVisible();

    // Toggle the inherit failure store switch
    await page.getByTestId('inheritFailureStoreSwitch').click();
    await page.getByTestId('failureStoreModalSaveButton').click();

    // Verify the modal is closed
    await expect(page.getByTestId('editFailureStoreModal')).toBeHidden();
  });
});
