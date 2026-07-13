/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const INGESTION_DURATION_MINUTES = 5;
const INGESTION_RATE = 10;
const PLAIN_STREAM = 'logs-canvas-plain';
const PROCESSING_STREAM = 'logs-canvas-processing';

test.describe(
  'Stream canvas - classic source to destination nodes',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient, apiServices, logsSynthtraceEsClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true,
      });

      const currentTime = Date.now();
      const startTime = new Date(
        currentTime - INGESTION_DURATION_MINUTES * 60 * 1000
      ).toISOString();
      const endTime = new Date(currentTime).toISOString();

      for (const index of [PLAIN_STREAM, PROCESSING_STREAM]) {
        await generateLogsData(logsSynthtraceEsClient)({
          index,
          startTime,
          endTime,
          docsPerMinute: INGESTION_RATE,
        });
      }

      // Give one stream processing so its destination renders the processing glyph.
      await apiServices.streams.updateStreamProcessors(PROCESSING_STREAM, {
        steps: [
          {
            action: 'set',
            to: 'canvas_test_field',
            value: 'canvas_test_value',
          },
        ],
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // The canvas renders all classic streams regardless of which one is open.
      await pageObjects.streams.gotoCanvasTab(PLAIN_STREAM);
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      for (const name of [PLAIN_STREAM, PROCESSING_STREAM]) {
        try {
          await apiServices.streams.deleteStream(name);
        } catch {
          // stream may already be gone
        }
      }

      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: false,
      });
    });

    test('renders inferred source and destination nodes for classic streams', async ({ page }) => {
      await expect(page.locator('[data-test-subj="streamsCanvasTab"]')).toBeVisible();

      // The inferred source node is labeled from the stream name.
      await expect(
        page.locator('[data-test-subj="streamsCanvasSourceNode"]', { hasText: PLAIN_STREAM })
      ).toBeVisible();

      // Both seeded streams render as their own destination node.
      await expect(
        page.locator('[data-test-subj="streamsCanvasDestinationNode"]', { hasText: PLAIN_STREAM })
      ).toBeVisible();
      await expect(
        page.locator('[data-test-subj="streamsCanvasDestinationNode"]', {
          hasText: PROCESSING_STREAM,
        })
      ).toBeVisible();
    });

    test('shows the processing glyph only on destinations with processing', async ({ page }) => {
      const processingDestination = page.locator(
        '[data-test-subj="streamsCanvasDestinationNode"]',
        { hasText: PROCESSING_STREAM }
      );
      await expect(
        processingDestination.locator('[data-test-subj="streamsCanvasProcessingGlyph"]')
      ).toBeVisible();

      const plainDestination = page.locator('[data-test-subj="streamsCanvasDestinationNode"]', {
        hasText: PLAIN_STREAM,
      });
      await expect(
        plainDestination.locator('[data-test-subj="streamsCanvasProcessingGlyph"]')
      ).toHaveCount(0);
    });
  }
);
