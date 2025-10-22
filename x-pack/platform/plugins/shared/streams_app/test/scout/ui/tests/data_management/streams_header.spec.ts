/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const INGESTION_DURATION_MINUTES = 5;
const TEST_STREAM_NAME = 'logs-test-stream';

test.describe('Stream detail header', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    const currentTime = Date.now();
    await apiServices.streams.enable();
    // Generate 50 logs over the last 5 minutes
    await generateLogsData(logsSynthtraceEsClient)({
      index: TEST_STREAM_NAME,
      startTime: new Date(currentTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 10,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoStreamMainPage();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.deleteStream(TEST_STREAM_NAME);
    await apiServices.streams.disable();
  });

  test('shows correct Discover badge', async ({ pageObjects }) => {
    await pageObjects.streams.gotoDataRetentionTab(TEST_STREAM_NAME);
    await pageObjects.streams.verifyDiscoverButtonLink(TEST_STREAM_NAME);
  });

  test('shows correct Lifecycle badge', async ({ pageObjects, config }) => {
    await pageObjects.streams.gotoDataRetentionTab(TEST_STREAM_NAME);

    const isServerless = config.serverless ?? false;

    await pageObjects.streams.verifyLifecycleBadge(
      TEST_STREAM_NAME,
      isServerless ? 'Indefinite' : 'ILM Policy: logs'
    );
  });

  test('transitions data quality from Good -> Degraded -> Poor for stream', async ({
    logsSynthtraceEsClient,
    page,
    pageObjects,
  }) => {
    // Initial data quality should be good
    await pageObjects.streams.verifyDataQuality(TEST_STREAM_NAME, 'Good');

    const currentTime = Date.now();
    // Ingest 1 doc with a malformed messaege to have 1 degraded document
    await generateLogsData(logsSynthtraceEsClient)({
      index: TEST_STREAM_NAME,
      startTime: new Date(currentTime - 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 1,
      isMalformed: true,
    });

    // Refresh the page to reflect the processor changes
    await page.reload();

    // We should have 51 documents in total now, 1 degraded -> ~1.96% degraded docs -> < 3% so Degraded quality
    await pageObjects.streams.verifyDataQuality(TEST_STREAM_NAME, 'Degraded');

    // Ingest 4 more malformed docs to have 5 degraded documents
    await generateLogsData(logsSynthtraceEsClient)({
      index: TEST_STREAM_NAME,
      startTime: new Date(currentTime - 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 4,
      isMalformed: true,
    });

    // Refresh the page to reflect the processor changes
    await page.reload();

    // We should have 55 documents in total now, 5 degraded -> ~9.09% degraded docs -> > 3% so Poor quality
    await pageObjects.streams.verifyDataQuality(TEST_STREAM_NAME, 'Poor');
  });

  test('shows Classic badge on classic stream', async ({ pageObjects }) => {
    await pageObjects.streams.gotoDataRetentionTab(TEST_STREAM_NAME);
    await pageObjects.streams.verifyClassicBadge();
  });

  test('shows Wired badge on wired stream', async ({ pageObjects }) => {
    await pageObjects.streams.gotoDataRetentionTab('logs');
    await pageObjects.streams.verifyWiredBadge();
  });
});
