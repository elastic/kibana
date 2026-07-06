/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const INGESTION_DURATION_MINUTES = 5;
const TEST_STREAM_NAME = 'logs-test-stream';

test.describe(
  'Stream detail header',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      const currentTime = Date.now();
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
    });

    test('shows correct badges', async ({ pageObjects, config }) => {
      await pageObjects.streams.gotoDataRetentionTab(TEST_STREAM_NAME);
      await test.step('verify Discover badge link', async () => {
        await pageObjects.streams.verifyDiscoverButtonLink(TEST_STREAM_NAME);
      });

      await test.step('verify Lifecycle badge link', async () => {
        const isServerless = config.serverless ?? false;

        await pageObjects.streams.verifyLifecycleBadge(
          TEST_STREAM_NAME,
          isServerless ? 'Indefinite' : 'ILM Policy: logs'
        );
      });

      await test.step('verify Classic badge on classic stream', async () => {
        await pageObjects.streams.verifyClassicBadge();
      });
    });

    test('shows Wired badge on wired stream', async ({ pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs.otel');
      await pageObjects.streams.verifyWiredBadge();
    });

    test('transitions data quality from Good -> Degraded -> Poor for stream', async ({
      logsSynthtraceEsClient,
      page,
      pageObjects,
    }) => {
      // Initial data quality should be good
      await pageObjects.streams.verifyDataQuality(TEST_STREAM_NAME, 'Good');

      let currentTime = Date.now();
      // Ingest 1 doc with a malformed messaege to have 1 degraded document
      await generateLogsData(logsSynthtraceEsClient)({
        index: TEST_STREAM_NAME,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 1,
        isMalformed: true,
      });

      // First transition: Degraded
      await expect
        .poll(
          async () => {
            await page.reload();
            return page
              .locator(`[data-test-subj="dataQualityIndicator-${TEST_STREAM_NAME}"]`)
              .textContent();
          },
          { timeout: 90_000, intervals: [5000] }
        )
        .toContain('Degraded');

      currentTime = Date.now();
      // Ingest 4 more malformed docs to have 5 degraded documents
      await generateLogsData(logsSynthtraceEsClient)({
        index: TEST_STREAM_NAME,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 4,
        isMalformed: true,
      });

      // Second transition: Poor
      await expect
        .poll(
          async () => {
            await page.reload();
            return page
              .locator(`[data-test-subj="dataQualityIndicator-${TEST_STREAM_NAME}"]`)
              .textContent();
          },
          { timeout: 90_000, intervals: [5000] }
        )
        .toContain('Poor');
    });
  }
);
