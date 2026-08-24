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
const INGESTION_RATE = 10;
const GOOD_QUALITY_STREAM = 'logs-good-quality';
const DEGRADED_QUALITY_STREAM = 'logs-degraded-quality';
const POOR_QUALITY_STREAM = 'logs-poor-quality';

test.describe(
  'Stream list view - table values',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      const currentTime = Date.now();
      // Stream 1: Good quality stream - no failed or degraded docs, 50 docs total
      await generateLogsData(logsSynthtraceEsClient)({
        index: GOOD_QUALITY_STREAM,
        startTime: new Date(currentTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: INGESTION_RATE,
      });

      // Stream 2: Degraded quality stream - 52 docs in total,1 failed (< 3%) and 1 degraded doc (< 3%)
      await generateLogsData(logsSynthtraceEsClient)({
        index: DEGRADED_QUALITY_STREAM,
        startTime: new Date(currentTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: INGESTION_RATE,
      });
      // Add 1 degraded doc
      await generateLogsData(logsSynthtraceEsClient)({
        index: DEGRADED_QUALITY_STREAM,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 1,
        isMalformed: true,
      });
      // Add a processor that always fails
      await apiServices.streams.updateStreamProcessors(DEGRADED_QUALITY_STREAM, {
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
      // Add 1 failed doc
      await generateLogsData(logsSynthtraceEsClient)({
        index: DEGRADED_QUALITY_STREAM,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 1,
      });

      // Stream 3: Poor quality stream - 60 docs in total, 5 failed (> 3%) and 5 degraded (> 3%) docs
      await generateLogsData(logsSynthtraceEsClient)({
        index: POOR_QUALITY_STREAM,
        startTime: new Date(currentTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: INGESTION_RATE,
      });
      // Add 5 degraded doc
      await generateLogsData(logsSynthtraceEsClient)({
        index: POOR_QUALITY_STREAM,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 5,
        isMalformed: true,
      });
      // Add a processor that always fails
      await apiServices.streams.updateStreamProcessors(POOR_QUALITY_STREAM, {
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
      // Add 5 failed doc
      await generateLogsData(logsSynthtraceEsClient)({
        index: POOR_QUALITY_STREAM,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 5,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoStreamMainPage();
      // Wait for the streams table to load
      await pageObjects.streams.expectStreamsTableVisible();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.streams.deleteStream(GOOD_QUALITY_STREAM);
      await apiServices.streams.deleteStream(DEGRADED_QUALITY_STREAM);
      await apiServices.streams.deleteStream(POOR_QUALITY_STREAM);
    });

    test('should display correct doc count in the table', async ({ pageObjects, page }) => {
      // Poll all three counts together: failure-store settling lags indexing on serverless.
      await expect
        .poll(
          async () => {
            await page.reload();
            await pageObjects.streams.expectStreamsTableVisible();
            const [good, degraded, poor] = await Promise.all([
              page
                .locator(`[data-test-subj="streamsDocCount-${GOOD_QUALITY_STREAM}"]`)
                .textContent(),
              page
                .locator(`[data-test-subj="streamsDocCount-${DEGRADED_QUALITY_STREAM}"]`)
                .textContent(),
              page
                .locator(`[data-test-subj="streamsDocCount-${POOR_QUALITY_STREAM}"]`)
                .textContent(),
            ]);
            return { good, degraded, poor };
          },
          { timeout: 90_000, intervals: [5000] }
        )
        .toStrictEqual({ good: '50', degraded: '52', poor: '60' });
    });

    test('should display correct data quality badge', async ({ pageObjects, page }) => {
      // Reload between iterations: the list view caches doc-count promises per page mount.
      await expect
        .poll(
          async () => {
            await page.reload();
            await pageObjects.streams.expectStreamsTableVisible();
            const [good, degraded, poor] = await Promise.all([
              page
                .locator(`[data-test-subj="dataQualityIndicator-${GOOD_QUALITY_STREAM}"]`)
                .textContent(),
              page
                .locator(`[data-test-subj="dataQualityIndicator-${DEGRADED_QUALITY_STREAM}"]`)
                .textContent(),
              page
                .locator(`[data-test-subj="dataQualityIndicator-${POOR_QUALITY_STREAM}"]`)
                .textContent(),
            ]);
            return { good, degraded, poor };
          },
          { timeout: 90_000, intervals: [5000] }
        )
        .toStrictEqual({ good: 'Good', degraded: 'Degraded', poor: 'Poor' });
    });

    test('should display correct retention in the table', async ({ pageObjects, config }) => {
      const isServerless = config.serverless ?? false;
      // Verify the retention for each log stream is the 'logs' ILM policy
      const streamNames = [GOOD_QUALITY_STREAM, DEGRADED_QUALITY_STREAM, POOR_QUALITY_STREAM];

      for (const name of streamNames) {
        await pageObjects.streams.verifyRetention(name, isServerless ? 'Indefinite' : 'logs');
      }
    });

    test('should provide Discover actions with correct ESQL queries', async ({ pageObjects }) => {
      const streamNames = [GOOD_QUALITY_STREAM, DEGRADED_QUALITY_STREAM, POOR_QUALITY_STREAM];

      for (const name of streamNames) {
        await pageObjects.streams.verifyDiscoverButtonLink(name);
      }
    });
  }
);
