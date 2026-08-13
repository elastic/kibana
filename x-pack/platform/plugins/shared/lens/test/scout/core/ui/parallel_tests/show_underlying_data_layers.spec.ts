/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverApp, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  openInDiscoverAndCheck,
  openXyVisWithTermsSplit,
  spaceTest,
  testData,
} from '../fixtures';

const BASE_DISCOVER_COLUMNS = ['@timestamp', 'extension.raw', 'bytes'];

async function expectDiscoverColumns(discoverPage: ScoutPage, columns: string[]) {
  const discover = new DiscoverApp(discoverPage);
  await discover.waitUntilSearchingHasFinished();
  // justified: Discover columns can lag the query-finished signal by one paint
  await expect.poll(() => discover.getDocHeader(), { timeout: 20_000 }).toStrictEqual(columns);
}

spaceTest.describe(
  'Lens show underlying data — layer types',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      loadLensArchives: true,
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
      await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });
      await openXyVisWithTermsSplit(pageObjects);
    });

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'shows the open button for a compatible saved visualization',
      async ({ context, kbnUrl, pageObjects }) => {
        const { lens } = pageObjects;

        await openInDiscoverAndCheck({ context, kbnUrl }, lens, (discoverPage) =>
          expectDiscoverColumns(discoverPage, BASE_DISCOVER_COLUMNS)
        );
      }
    );

    spaceTest(
      'shows the open button with an annotation layer',
      async ({ context, kbnUrl, pageObjects }) => {
        const { lens } = pageObjects;

        await lens.layers.createLayer('annotations');
        await lens.layers.ensureLayerTabIsActive(0);
        await expect
          .poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_splitDimensionPanel'))
          .toContain('extension.raw');

        await openInDiscoverAndCheck({ context, kbnUrl }, lens, (discoverPage) =>
          expectDiscoverColumns(discoverPage, BASE_DISCOVER_COLUMNS)
        );
      }
    );

    spaceTest(
      'shows the open button with a reference line layer',
      async ({ context, kbnUrl, pageObjects }) => {
        const { lens } = pageObjects;

        await lens.layers.createLayer('referenceLine');
        await lens.layers.ensureLayerTabIsActive(0);
        await expect
          .poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_splitDimensionPanel'))
          .toContain('extension.raw');

        await openInDiscoverAndCheck({ context, kbnUrl }, lens, (discoverPage) =>
          expectDiscoverColumns(discoverPage, BASE_DISCOVER_COLUMNS)
        );
      }
    );

    spaceTest('hides the open button with multiple data layers', async ({ page, pageObjects }) => {
      const { lens } = pageObjects;

      await lens.layers.createLayer('data');
      await lens.layers.ensureLayerTabIsActive(1);
      await expect(
        page.testSubj.locator('lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension')
      ).toBeVisible();
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await lens.waitForVisualization(testData.XY_CHART);
      await expect(lens.workspace.openInDiscoverButton).toBeDisabled();
    });
  }
);
