/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { tags, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { StreamsUnit } from '@kbn/streams-schema';
import { mockComponentCatalogue } from '../../../scout/common/ui/fixtures/component_catalogue_mocks';
import type { StreamsApp } from '../../../scout/common/ui/fixtures/page_objects/streams_app';
import { test } from '../fixtures';

const SOURCE = 'intake';
const FIRST = 'primary';
const SECOND = 'backup';
const CREATED = 'archive';

const initialUnit: StreamsUnit.GetResponse = {
  unit: {
    sources: [{ id: SOURCE, name: SOURCE, type: 'otlp', supported_telemetry: ['logs'] }],
    destinations: [FIRST, SECOND].map((id) => ({
      id,
      name: id,
      type: 'elasticsearch',
      supported_telemetry: ['logs'],
      config: [{ name: 'index', value: `logs-${id}.otel-default` }],
    })),
    pipelines: [
      {
        id: 'p-intake',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: [SOURCE] },
          { name: 'destinations', value: [FIRST] },
        ],
      },
    ],
  },
  ui_metadata: {},
};

const stageLine = async (page: ScoutPage, streams: StreamsApp) => {
  const source = page.getByLabel(/^Source: intake\b/);
  const destination = page.getByLabel(/^Destination: backup\b/);
  const handle = source.getByLabel('Drag to connect this source');
  await handle.hover();
  const bounds = await handle.boundingBox();
  if (!bounds) throw new Error('Source connection handle is not visible');
  await page.mouse.down();
  try {
    // React Flow enables the drop target only after the pointer starts moving.
    await page.mouse.move(bounds.x + bounds.width / 2 + 5, bounds.y + bounds.height / 2);
    await destination.getByLabel('Drop to connect a source').hover();
  } finally {
    await page.mouse.up();
  }
  await expect(streams.getCanvasEdge(`unit-connection-${SOURCE}->${SECOND}`)).toBeVisible();
};

const createDestination = async (page: ScoutPage, streams: StreamsApp) => {
  await streams.canvasAddDestination.click();
  await page.testSubj.locator('streamsCreateDestinationName').fill(CREATED);
  await page.testSubj.locator('streamsCreateDestinationSubmit').click();
  await expect(page.testSubj.locator('streamsCreateDestinationModal')).toBeHidden();
  await expect(streams.getCanvasDestinationNode(CREATED)).toBeVisible();
};

test.describe('Stream map component saves', { tag: tags.serverless.observability.complete }, () => {
  let writes: StreamsUnit.GetResponse[];

  let restoreCanvasSetting: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ kbnClient }) => {
    const setting = OBSERVABILITY_STREAMS_ENABLE_CANVAS;
    const previous = await kbnClient.uiSettings.get(setting);
    if (previous === true) return;
    await kbnClient.uiSettings.update({ [setting]: true });
    restoreCanvasSetting = async () => {
      if (previous === undefined) {
        await kbnClient.uiSettings.unset(setting);
      } else {
        await kbnClient.uiSettings.update({ [setting]: previous });
      }
    };
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects: { streams } }) => {
    writes = [];
    await browserAuth.loginAsAdmin();
    await mockComponentCatalogue(page);
    await page.route('**/internal/streams/unit/default', async (route) => {
      if (route.request().method() === 'PUT') {
        writes.push(route.request().postDataJSON());
        await route.fulfill({ json: { acknowledged: true } });
      } else {
        const { unit, ui_metadata } = writes.at(-1) ?? initialUnit;
        await route.fulfill({ json: { unit, ui_metadata } });
      }
    });
    await page.route('**/internal/streams/unit/*/_stats', (route) =>
      route.fulfill({
        json: {
          components: { destinations: {}, processors: {}, sources: {} },
          meta: { window: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-01T00:15:00.000Z' } },
        },
      })
    );
    await page.route('**/internal/streams/unit/*/_resolve_indices?**', (route) =>
      route.fulfill({ json: { destinations: {} } })
    );
    await page.route('**/internal/streams/destinations/api_key', (route) =>
      route.fulfill({
        json: {
          id: 'mock-key',
          name: CREATED,
          encodedApiKey: 'test-key',
          createdAt: '2026-01-01T00:00:00Z',
        },
      })
    );
    await streams.gotoStreamsLayoutTab('map');
  });

  test.afterAll(async () => {
    await restoreCanvasSetting?.();
  });

  test('creating a destination keeps an unsaved line unsaved', async ({
    page,
    pageObjects: { streams },
  }) => {
    await stageLine(page, streams);
    await createDestination(page, streams);
    expect(writes).toHaveLength(1);
    expect(writes[0].unit.destinations).toContainEqual(expect.objectContaining({ name: CREATED }));
    expect(writes[0].unit.pipelines).toStrictEqual(initialUnit.unit.pipelines);
    await expect(streams.getCanvasEdge(`unit-connection-${SOURCE}->${SECOND}`)).toBeVisible();
    await expect(page.testSubj.locator('streamsCanvasSaveChanges')).toBeVisible();
    await expect(streams.getCanvasDestinationNode(CREATED)).toBeVisible();
    await expect(streams.canvasUndo).toBeDisabled();
  });

  test('a delete from the destination flyout waits for Save', async ({
    page,
    pageObjects: { streams },
  }) => {
    const destination = streams.getCanvasDestinationNode(SECOND);
    await streams.clickCanvasNode(destination);
    await page.testSubj.locator('streamsDeleteDestinationButton').click();
    await page.testSubj.locator('confirmModalConfirmButton').click();
    await expect(destination).toBeHidden();
    await expect(page.testSubj.locator('streamsUnitDestinationFlyout')).toBeHidden();
    expect(writes).toHaveLength(0);
    await page.testSubj.locator('streamsCanvasSaveChanges').click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].unit.destinations.map(({ id }) => id)).toStrictEqual([FIRST]);
    expect(writes[0].unit.pipelines).toStrictEqual(initialUnit.unit.pipelines);
  });

  test('processing on an unsaved connection opens read-only and asks to save the map first', async ({
    page,
    pageObjects: { streams },
  }) => {
    await stageLine(page, streams);
    await streams.openCanvasEdgeMenu(`unit-connection-${SOURCE}->${FIRST}`);
    await streams.canvasEdgeMenuAddProcessing.click();
    await expect(page.testSubj.locator('streamsProcessingFlyoutUnsavedSlot')).toBeVisible();
    await expect(streams.processingFlyout.getByText('Read only', { exact: true })).toBeVisible();
    await expect(
      streams.processingFlyout.getByRole('button', { name: /add processor/i, disabled: false })
    ).toHaveCount(0);
    await expect(streams.processingFlyoutSave).toBeDisabled();
    await page.testSubj.locator('streamsProcessingFlyoutClose').click();
    await expect(streams.processingFlyout).toBeHidden();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect(writes).toHaveLength(0);
  });
});
