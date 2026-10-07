/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ScoutPage } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { generateLogsData } from '../fixtures/generators';

const INGESTION_DURATION_MINUTES = 5;
const INGESTION_RATE = 10;
const CLASSIC_STREAM = 'logs-canvas-search-classic';
const DESTINATION_ID = 'canvas-search-destination';
const DESTINATION_NAME = 'Canvas search destination';
const SUPPORTED_TELEMETRY = ['logs', 'metrics', 'traces'];

/**
 * Unit writes go through the config distributor, which the test stack does not
 * run, so the configured destination is served from a mocked unit instead.
 */
const MOCK_UNIT = {
  unit: {
    sources: [
      { id: 'nop-input', name: 'Nop', type: 'nop', supported_telemetry: SUPPORTED_TELEMETRY },
    ],
    destinations: [
      { id: 'debug-out', name: 'Debug', type: 'debug', supported_telemetry: SUPPORTED_TELEMETRY },
      {
        id: DESTINATION_ID,
        name: DESTINATION_NAME,
        type: 'elasticsearch',
        supported_telemetry: SUPPORTED_TELEMETRY,
        config: [{ name: 'index', value: 'logs-canvas-search' }],
      },
    ],
    pipelines: [
      {
        id: 'main',
        supported_telemetry: SUPPORTED_TELEMETRY,
        config: [
          { name: 'sources', value: ['nop-input'] },
          { name: 'destinations', value: ['debug-out'] },
        ],
      },
    ],
  },
  ui_metadata: {},
};

const mockUnitDefinition = async (page: ScoutPage) => {
  await page.route('**/internal/streams/unit/default', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_UNIT),
    });
  });
};

test.describe(
  'Stream canvas - search',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient, logsSynthtraceEsClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true,
      });

      const currentTime = Date.now();
      await generateLogsData(logsSynthtraceEsClient)({
        index: CLASSIC_STREAM,
        startTime: new Date(currentTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: INGESTION_RATE,
      });
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await mockUnitDefinition(page);
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      try {
        await apiServices.streams.deleteStream(CLASSIC_STREAM);
      } catch {
        // stream may already be gone
      }

      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: false,
      });
    });

    test('pivots from a destination row into a pre-filled canvas search', async ({
      page,
      pageObjects: { streams },
    }) => {
      await streams.gotoStreamsLayoutTab('destinations');
      await expect(streams.streamsDestinationsTable).toBeVisible();

      await streams.getDestinationShowOnCanvasButton(DESTINATION_NAME).click();

      await expect(streams.getStreamsLayoutTab('canvas')).toHaveAttribute('aria-selected', 'true');
      await expect(streams.canvasSearch).toHaveValue(DESTINATION_NAME);
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get('canvasState')?.includes(`query:'${DESTINATION_NAME}'`) ?? false
      );

      // Only the matching flow is rendered; the unrelated classic stream is hidden.
      await expect(streams.getCanvasDestinationNode(DESTINATION_NAME)).toBeVisible();
      await expect(streams.getCanvasDestinationNode(CLASSIC_STREAM)).toHaveCount(0);
      await expect(streams.getCanvasSourceNode(CLASSIC_STREAM)).toHaveCount(0);

      await streams.canvasSearch.fill('');

      await expect(page).toHaveURL(/query:!n/);
      await expect(streams.getCanvasDestinationNode(CLASSIC_STREAM)).toBeVisible();
      await expect(streams.getCanvasSourceNode(CLASSIC_STREAM)).toBeVisible();
    });

    test('filters the canvas while typing', async ({ page, pageObjects: { streams } }) => {
      await streams.gotoStreamsLayoutTab('canvas');
      await expect(streams.getCanvasDestinationNode(DESTINATION_NAME)).toBeVisible();

      await streams.canvasSearch.fill(CLASSIC_STREAM);

      await expect(page).toHaveURL(new RegExp(`query:'?${CLASSIC_STREAM}`));
      await expect(streams.getCanvasSourceNode(CLASSIC_STREAM)).toBeVisible();
      await expect(streams.getCanvasDestinationNode(CLASSIC_STREAM)).toBeVisible();
      await expect(streams.getCanvasDestinationNode(DESTINATION_NAME)).toHaveCount(0);
    });

    test('applies a search from the URL', async ({ pageObjects: { streams } }) => {
      await streams.gotoCanvasSearch(DESTINATION_NAME);

      await expect(streams.canvasSearch).toHaveValue(DESTINATION_NAME);
      await expect(streams.getCanvasDestinationNode(DESTINATION_NAME)).toBeVisible();
      await expect(streams.getCanvasDestinationNode(CLASSIC_STREAM)).toHaveCount(0);
    });

    test('explains when nothing matches the search', async ({ pageObjects: { streams } }) => {
      await streams.gotoCanvasSearch('does-not-exist');

      await expect(streams.canvasSearchNoMatches).toBeVisible();
      await expect(streams.getCanvasDestinationNode(CLASSIC_STREAM)).toHaveCount(0);
      await expect(streams.getCanvasDestinationNode(DESTINATION_NAME)).toHaveCount(0);
    });
  }
);
