/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const INGESTION_DURATION_MINUTES = 5;

test.describe('Stream list view - table values', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    const currentTime = Date.now();
    await apiServices.streams.enable();
    // Generate logs for the last 2 minutes for two streams with different ingestion rates
    await generateLogsData(logsSynthtraceEsClient)({
      index: 'logs-10-docs-per-minute',
      startTime: new Date(currentTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 10,
    });
    await generateLogsData(logsSynthtraceEsClient)({
      index: 'logs-20-docs-per-minute',
      startTime: new Date(currentTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 20,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoStreamMainPage();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.deleteStream('logs-10-docs-per-minute');
    await apiServices.streams.deleteStream('logs-20-docs-per-minute');
    await apiServices.streams.disable();
  });

  test('should display correct doc count in the table', async ({ pageObjects }) => {
    // Wait for the streams table to load
    await pageObjects.streams.expectStreamsTableVisible();

    // Verify the document count for each stream in the default time range - last 15 minutes
    await pageObjects.streams.verifyDocCount(
      'logs-10-docs-per-minute',
      INGESTION_DURATION_MINUTES * 10
    );
    await pageObjects.streams.verifyDocCount(
      'logs-20-docs-per-minute',
      INGESTION_DURATION_MINUTES * 20
    );
  });

  test('should display Good data quality when there are no failed or degraded docs', async ({
    pageObjects,
  }) => {
    // Initial data quality should be good
    await pageObjects.streams.verifyDataQuality('logs-10-docs-per-minute', 'Good');
    await pageObjects.streams.verifyDataQuality('logs-20-docs-per-minute', 'Good');
  });

  test('should display Degraded or Poor data quality when there are degraded docs', async ({
    pageObjects,
    page,
    logsSynthtraceEsClient,
  }) => {
    const currentTime = Date.now();
    // Ingest 1 doc with a malformed messaege to have 1 degraded document
    await generateLogsData(logsSynthtraceEsClient)({
      index: 'logs-10-docs-per-minute',
      startTime: new Date(currentTime - 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 1,
      isMalformed: true,
    });

    // Refresh the page to reflect the processor changes
    await page.reload();

    // We should have 51 documents in total now, 1 degraded -> ~1.96% degraded docs -> < 3% so Degraded quality
    await pageObjects.streams.verifyDocCount(
      'logs-10-docs-per-minute',
      INGESTION_DURATION_MINUTES * 10 + 1
    );
    await pageObjects.streams.verifyDataQuality('logs-10-docs-per-minute', 'Degraded');

    // Ingest 4 more malformed docs to have 5 degraded documents
    await generateLogsData(logsSynthtraceEsClient)({
      index: 'logs-10-docs-per-minute',
      startTime: new Date(currentTime - 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 4,
      isMalformed: true,
    });

    // Refresh the page to reflect the processor changes
    await page.reload();

    // We should have 55 documents in total now, 5 degraded -> ~9.09% degraded docs -> > 3% so Poor quality
    await pageObjects.streams.verifyDocCount(
      'logs-10-docs-per-minute',
      INGESTION_DURATION_MINUTES * 10 + 5
    );
    await pageObjects.streams.verifyDataQuality('logs-10-docs-per-minute', 'Poor');
  });

  test('should display Degraded or Poor data quality when there are failed docs', async ({
    apiServices,
    pageObjects,
    page,
    logsSynthtraceEsClient,
  }) => {
    // Create a processor that always fails
    await apiServices.streams.updateStreamProcessors('logs-20-docs-per-minute', {
      steps: [
        {
          action: 'rename',
          from: 'non_existent_field',
          to: 'renamed_field',
          ignore_missing: false,
          override: false,
        },
      ],
    });

    const currentTime = Date.now();
    // Ingest 1 doc to have 1 failed document
    await generateLogsData(logsSynthtraceEsClient)({
      index: 'logs-20-docs-per-minute',
      startTime: new Date(currentTime - 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 1,
    });

    // Refresh the page to reflect the processor changes
    await page.reload();

    // We should have 101 documents in total now, 1 failed -> ~0.99% failed docs -> < 3% so Degraded quality
    await pageObjects.streams.verifyDocCount(
      'logs-20-docs-per-minute',
      INGESTION_DURATION_MINUTES * 20 + 1
    );
    await pageObjects.streams.verifyDataQuality('logs-20-docs-per-minute', 'Degraded');

    // Ingest 4 more docs to have 5 failed documents
    await generateLogsData(logsSynthtraceEsClient)({
      index: 'logs-20-docs-per-minute',
      startTime: new Date(currentTime - 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 4,
    });

    // Refresh the page to reflect the processor changes
    await page.reload();

    // We should have 105 documents in total now, 5 failed -> ~4.76% failed docs -> > 3% so Poor quality
    await pageObjects.streams.verifyDocCount(
      'logs-20-docs-per-minute',
      INGESTION_DURATION_MINUTES * 20 + 5
    );
    await pageObjects.streams.verifyDataQuality('logs-20-docs-per-minute', 'Poor');
  });

  test('should display correct retention in the table', async ({ pageObjects }) => {
    // Wait for the streams table to load
    await pageObjects.streams.expectStreamsTableVisible();

    // Verify the retention for each log stream is the 'logs' ILM policy
    await pageObjects.streams.verifyRetention('logs-10-docs-per-minute', 'logs');
    await pageObjects.streams.verifyRetention('logs-20-docs-per-minute', 'logs');
  });

  test('should provide Discover actions with correct ESQL queries', async ({ pageObjects }) => {
    // Wait for the streams table to load
    await pageObjects.streams.expectStreamsTableVisible();

    const streamNames = ['logs-10-docs-per-minute', 'logs-20-docs-per-minute'];

    for (const name of streamNames) {
      await pageObjects.streams.verifyDiscoverButtonLink(name);
    }
  });
});
