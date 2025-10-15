/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';

test.describe('Stream data quality', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs');
    // Create a test stream with routing rules first
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });

    await pageObjects.streams.gotoDataQualityTab('logs.nginx');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test('should show data quality metrics', async ({ page, pageObjects }) => {
    // Degraded and failed documents metrics should be visible
    await expect(
      page.getByTestId('datasetQualityDetailsSummaryKpiCard-Degraded documents')
    ).toBeVisible();
    await expect(
      page.getByTestId('datasetQualityDetailsSummaryKpiCard-Failed documents')
    ).toBeVisible();

    // Edit failure store button should not be visible for wired streams
    await page.getByTestId('datasetQualityDetailsSummaryKpiCard-Failed documents').click();
    await expect(page.getByTestId('datasetQualityDetailsEditFailureStore')).not.toBeVisible();

    // Quality issues table should be visible
    await expect(page.getByTestId('datasetQualityDetailsDegradedFieldTable')).toBeVisible();
  });
});
