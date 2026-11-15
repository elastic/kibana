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

const SOURCE_ID = 'canvas-processing-source';
const DESTINATION_ID = 'canvas-processing-destination';
const FANOUT_SOURCE_ID = 'canvas-processing-fanout-source';
const FANOUT_DESTINATION_IDS = ['canvas-processing-fanout-a', 'canvas-processing-fanout-b'];

const elasticsearchDestination = (id: string) => ({
  id,
  name: id,
  type: 'elasticsearch',
  supported_telemetry: ['logs'],
  config: [{ name: 'index', value: `logs-${id}` }],
});

/**
 * Unit writes go through the config distributor, which the test stack does not
 * run, so the unit is served from a mock and saves are captured instead.
 */
const MOCK_UNIT = {
  unit: {
    sources: [
      { id: SOURCE_ID, name: SOURCE_ID, type: 'otlp', supported_telemetry: ['logs'] },
      { id: FANOUT_SOURCE_ID, name: FANOUT_SOURCE_ID, type: 'otlp', supported_telemetry: ['logs'] },
    ],
    destinations: [DESTINATION_ID, ...FANOUT_DESTINATION_IDS].map(elasticsearchDestination),
    pipelines: [
      {
        id: `p-${SOURCE_ID}`,
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: [SOURCE_ID] },
          { name: 'destinations', value: [DESTINATION_ID] },
        ],
      },
      {
        id: `p-${FANOUT_SOURCE_ID}`,
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: [FANOUT_SOURCE_ID] },
          { name: 'destinations', value: FANOUT_DESTINATION_IDS },
        ],
      },
    ],
  },
  ui_metadata: {},
};

const mockUnit = async (page: ScoutPage) => {
  await page.route('**/internal/streams/unit/default', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_UNIT),
      });
      return;
    }
    if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ acknowledged: true }),
      });
      return;
    }
    await route.continue();
  });
};

test.describe(
  'Stream canvas - processing',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({ [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true });
    });

    test.beforeEach(async ({ browserAuth, page, pageObjects: { streams } }) => {
      await browserAuth.loginAsAdmin();
      await mockUnit(page);
      await streams.gotoStreamsLayoutTab('map');
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({ [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: false });
    });

    test('adds a processing node between a source and a destination', async ({
      page,
      pageObjects: { streams },
    }) => {
      await streams.openCanvasEdgeMenu(`unit-connection-${SOURCE_ID}->${DESTINATION_ID}`);
      await streams.canvasEdgeMenuAddProcessing.click();

      await expect(streams.processingFlyout).toBeVisible();
      await streams.processingFlyout
        .getByTestId('streamsProcessingFlyoutEmptyAddProcessor')
        .click();
      await streams.addAddFieldsProcessor('team', 'core');

      await expect(
        streams.processingFlyout.getByTestId('streamsProcessingFlyoutStepSummary')
      ).toHaveText('upsert record.team = "core"');

      const saveRequest = page.waitForRequest(
        (request) =>
          request.method() === 'PUT' && request.url().endsWith('/internal/streams/unit/default')
      );
      await streams.processingFlyoutSave.click();
      const { unit } = (await saveRequest).postDataJSON();

      expect(unit.pipelines).toContainEqual({
        id: `p-${SOURCE_ID}`,
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: [SOURCE_ID] },
          { name: 'processors', value: ['add-fields-1'] },
          { name: 'destinations', value: [DESTINATION_ID] },
        ],
      });
      expect(unit.pipelines).toHaveLength(MOCK_UNIT.unit.pipelines.length);
      await expect(streams.processingFlyout).toBeHidden();
      await expect(streams.canvasProcessingNode).toBeVisible();
    });

    test('processes one fan-out line on a pipeline of its own', async ({
      page,
      pageObjects: { streams },
    }) => {
      await streams.openCanvasEdgeMenu(
        `unit-connection-${FANOUT_SOURCE_ID}->${FANOUT_DESTINATION_IDS[0]}`
      );

      await expect(streams.canvasEdgeMenuAddProcessing).toBeEnabled();
      await expect(streams.canvasEdgeMenuAddRouting).toBeEnabled();
      await streams.canvasEdgeMenuAddProcessing.click();
      await expect(
        streams.processingFlyout.getByTestId('streamsProcessingFlyoutEmpty')
      ).toBeVisible();
      await streams.processingFlyout
        .getByTestId('streamsProcessingFlyoutEmptyAddProcessor')
        .click();
      await streams.addAddFieldsProcessor('team', 'core');

      const saveRequest = page.waitForRequest(
        (request) =>
          request.method() === 'PUT' && request.url().endsWith('/internal/streams/unit/default')
      );
      await streams.processingFlyoutSave.click();
      const { unit } = (await saveRequest).postDataJSON();

      expect(unit.pipelines).toContainEqual({
        id: `p-${FANOUT_SOURCE_ID}`,
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: [FANOUT_SOURCE_ID] },
          { name: 'destinations', value: [FANOUT_DESTINATION_IDS[1]] },
        ],
      });
      expect(unit.pipelines).toContainEqual({
        id: `p-${FANOUT_SOURCE_ID}-2`,
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: [FANOUT_SOURCE_ID] },
          { name: 'processors', value: ['add-fields-1'] },
          { name: 'destinations', value: [FANOUT_DESTINATION_IDS[0]] },
        ],
      });
    });
  }
);
