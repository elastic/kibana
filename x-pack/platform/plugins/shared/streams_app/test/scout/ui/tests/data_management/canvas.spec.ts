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

    test('renders inferred source and destination nodes for classic streams', async ({
      pageObjects: { streams },
    }) => {
      await expect(streams.canvasTab).toBeVisible();

      // The inferred source node is labeled from the stream name.
      await expect(streams.getCanvasSourceNode(PLAIN_STREAM)).toBeVisible();

      // Both seeded streams render as their own destination node.
      await expect(streams.getCanvasDestinationNode(PLAIN_STREAM)).toBeVisible();
      await expect(streams.getCanvasDestinationNode(PROCESSING_STREAM)).toBeVisible();
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
      await streams.rightClickCanvasNode(streams.getCanvasDestinationNode(PLAIN_STREAM));
      await expect(streams.canvasContextMenu).toHaveCount(0);

      // Right-clicking the empty canvas offers "Tidy up" for the whole graph.
      await streams.openCanvasPaneContextMenu();
      await expect(streams.canvasContextMenuTidyUp).toBeVisible();

      await streams.canvasContextMenuTidyUp.click();
      await expect(streams.canvasContextMenu).toHaveCount(0);
      // Tidying records a history step, so undo becomes available.
      await expect(streams.canvasUndo).toBeEnabled();
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
      await expect(
        streams.getCanvasNodeByAriaLabel(`Source: ${PLAIN_STREAM}, async bulk ingest`)
      ).toBeVisible();

      // Escape closes an open context menu.
      await streams.openCanvasPaneContextMenu();
      await page.keyboard.press('Escape');
      await expect(streams.canvasContextMenu).toHaveCount(0);

      // Tidy up records a history step; Ctrl+Z (focus inside the canvas) undoes it.
      await streams.tidyUpCanvasFromPane();
      await expect(streams.canvasUndo).toBeEnabled();

      await streams.getCanvasDestinationNode(PLAIN_STREAM).click();
      await page.keyboard.press('Control+z');
      await expect(streams.canvasUndo).toBeDisabled();
    });

    test('undoes a keyboard-driven node reposition', async ({ page, pageObjects: { streams } }) => {
      // Selecting + focusing a node lets the arrow keys reposition it.
      await streams.getCanvasDestinationNode(PLAIN_STREAM).click();
      await page.keyboard.press('ArrowRight');

      // The keyboard move records a history step even though no pointer drag ran,
      // so undo becomes available and Ctrl+Z reverts it.
      await expect(streams.canvasUndo).toBeEnabled();
      await page.keyboard.press('Control+z');
      await expect(streams.canvasUndo).toBeDisabled();
    });

    test('shows the processing glyph only on destinations with processing', async ({
      pageObjects: { streams },
    }) => {
      await expect(streams.getCanvasProcessingGlyph(PROCESSING_STREAM)).toBeVisible();
      await expect(streams.getCanvasProcessingGlyph(PLAIN_STREAM)).toHaveCount(0);
    });
  }
);
