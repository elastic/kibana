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

const SOURCE_NAME = 'OTLP';
const DESTINATION_NAME = 'Elasticsearch';
const SUPPORTED_TELEMETRY = ['logs', 'metrics', 'traces'];

/**
 * Unit writes go through the config distributor, which the test stack does not
 * run, so the map is served from a mocked unit instead. The map only renders
 * supported source and destination types, so this fixture uses OTLP and
 * Elasticsearch rather than the temporary nop/debug defaults.
 */
const MOCK_UNIT = {
  unit: {
    sources: [
      {
        id: 'otlp-input',
        name: SOURCE_NAME,
        type: 'otlp',
        supported_telemetry: SUPPORTED_TELEMETRY,
      },
    ],
    destinations: [
      {
        id: 'es-out',
        name: DESTINATION_NAME,
        type: 'elasticsearch',
        supported_telemetry: SUPPORTED_TELEMETRY,
      },
    ],
    pipelines: [
      {
        id: 'main',
        supported_telemetry: SUPPORTED_TELEMETRY,
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'destinations', value: ['es-out'] },
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
  await page.route('**/internal/streams/unit/*/_resolve_indices', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ destinations: {} }),
    });
  });
};

test.describe(
  'Stream map',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true,
      });
    });

    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await mockUnitDefinition(page);
      await pageObjects.streams.gotoStreamsLayoutTab('map');
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: false,
      });
    });

    test('renders unit sources and destinations without a Data streams hub', async ({
      pageObjects: { streams },
    }) => {
      await expect(streams.canvasTab).toBeVisible();
      await expect(streams.canvasDataStreamsNode).toHaveCount(0);
      await expect(streams.getCanvasSourceNode(SOURCE_NAME)).toBeVisible();
      await expect(streams.getCanvasDestinationNode(DESTINATION_NAME)).toBeVisible();
      await expect(streams.canvasEmptyState).toHaveCount(0);
    });

    test('renders a minimap that collapses and reopens', async ({ pageObjects: { streams } }) => {
      await expect(streams.canvasMinimap).toBeVisible();

      await streams.canvasMinimapCollapse.click();
      await expect(streams.canvasMinimap).toHaveCount(0);
      await expect(streams.canvasMinimapExpand).toBeVisible();

      await streams.canvasMinimapExpand.click();
      await expect(streams.canvasMinimap).toBeVisible();
    });

    test('tidies up the whole graph from the pane menu and enables undo', async ({
      pageObjects: { streams },
    }) => {
      // A single node has no tidy action, so right-clicking one opens no menu.
      await streams.rightClickCanvasNode(streams.getCanvasDestinationNode(DESTINATION_NAME));
      await expect(streams.canvasContextMenu).toHaveCount(0);

      // Right-clicking the empty canvas offers "Tidy up" for the whole graph.
      await streams.openCanvasPaneContextMenu();
      await expect(streams.canvasContextMenuTidyUp).toBeVisible();

      await streams.canvasContextMenuTidyUp.click();
      await expect(streams.canvasContextMenu).toHaveCount(0);
      // Tidying records a history step, so undo becomes available.
      await expect(streams.canvasUndo).toBeEnabled();
    });

    test('keeps the viewport where the user left it when tidying up', async ({
      pageObjects: { streams },
    }) => {
      await streams.zoomInCanvas();
      const transform = await streams.getCanvasViewportTransform();

      // Tidy up relayouts the nodes and must leave the camera alone.
      await streams.tidyUpCanvasFromPane();
      await expect(streams.canvasUndo).toBeEnabled();

      expect(await streams.getCanvasViewportTransform()).toBe(transform);
    });

    test('keeps the viewport where the user left it when opening a node flyout', async ({
      page,
      pageObjects: { streams },
    }) => {
      await streams.zoomInCanvas();
      const transform = await streams.getCanvasViewportTransform();

      await streams.clickCanvasNode(streams.getCanvasDestinationNode(DESTINATION_NAME));
      await expect(page.testSubj.locator('streamsUnitDestinationFlyout')).toBeVisible();

      // The flyout is an overlay, so the canvas is neither resized nor
      // remounted and the viewport should be untouched.
      expect(await streams.getCanvasViewportTransform()).toBe(transform);
    });

    test('renders the canvas toolbar with undo/redo and add-node placeholders', async ({
      pageObjects: { streams },
    }) => {
      await expect(streams.canvasToolbar).toBeVisible();

      // Undo/redo start disabled since nothing has been changed yet.
      await expect(streams.canvasUndo).toBeDisabled();
      await expect(streams.canvasRedo).toBeDisabled();

      await expect(streams.canvasAddSource).toBeVisible();
      await expect(streams.canvasAddDestination).toBeVisible();
    });

    test('exposes accessible node labels and keyboard controls', async ({
      page,
      pageObjects: { streams },
    }) => {
      // Nodes carry a screen-reader label so Tab-focusing announces what they are.
      await expect(page.locator('.react-flow__node[aria-label*="Destination:"]')).toBeVisible();

      // Escape closes an open context menu.
      await streams.openCanvasPaneContextMenu();
      await page.keyboard.press('Escape');
      await expect(streams.canvasContextMenu).toHaveCount(0);

      // Tidy up records a history step; Ctrl+Z (focus inside the canvas) undoes it.
      await streams.tidyUpCanvasFromPane();
      await expect(streams.canvasUndo).toBeEnabled();

      await streams.clickCanvasNode(streams.getCanvasDestinationNode(DESTINATION_NAME), {
        modifiers: ['Shift'],
      });
      await page.keyboard.press('Control+z');
      await expect(streams.canvasUndo).toBeDisabled();
    });

    test('undoes a keyboard-driven node reposition', async ({ page, pageObjects: { streams } }) => {
      // Selecting + focusing a node lets the arrow keys reposition it.
      await streams.clickCanvasNode(streams.getCanvasDestinationNode(DESTINATION_NAME), {
        modifiers: ['Shift'],
      });
      await page.keyboard.press('ArrowRight');

      // The keyboard move records a history step even though no pointer drag ran,
      // so undo becomes available and Ctrl+Z reverts it.
      await expect(streams.canvasUndo).toBeEnabled();
      await page.keyboard.press('Control+z');
      await expect(streams.canvasUndo).toBeDisabled();
    });
  }
);
