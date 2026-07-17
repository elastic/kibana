/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { enableElasticChartDebug, getChartDebugData } from '../fixtures/open_in_lens_helpers';
import { addDataLayer, switchDataPanelIndexPattern } from '../fixtures';
import { testData } from '../fixtures';

const VIS_TITLE = 'xyChart with multiple data views';

const EXPECTED_LOGSTASH_DATA = [
  { x: 1540278360000, y: 4735 },
  { x: 1540280820000, y: 2836 },
];
const EXPECTED_FLIGHTS_DATA = [
  { x: 1540278720000, y: 12993.16 },
  { x: 1540279080000, y: 7927.47 },
  { x: 1540279500000, y: 7548.66 },
  { x: 1540280400000, y: 8418.08 },
  { x: 1540280580000, y: 11577.86 },
  { x: 1540281060000, y: 8088.12 },
  { x: 1540281240000, y: 6943.55 },
];

function getNonEmptyLineSeries(
  state: DebugState
): Array<Array<{ x: number; y: number }>> {
  return (
    state.lines
      ?.map(({ points }) =>
        points
          .map((point) => ({ x: point.x, y: Math.floor(point.y * 100) / 100 }))
          .sort(({ x }, { x: x2 }) => x - x2)
      )
      .filter((series) => series.length > 0) ?? []
  );
}

spaceTest.describe('Lens with multiple data views', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(
      testData.KBN_ARCHIVE_PATHS.LONG_WINDOW_LOGSTASH_INDEX_PATTERN
    );
    await scoutSpace.savedObjects.load(
      testData.KBN_ARCHIVE_PATHS.KIBANA_SAMPLE_DATA_FLIGHTS_INDEX_PATTERN
    );

    await scoutSpace.uiSettings.set({
      'courier:ignoreFilterIfFieldNotInIndex': true,
      defaultIndex: testData.DATA_VIEW_ID.LONG_WINDOW_LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify(testData.MULTIPLE_DATA_VIEWS_TIME_RANGE),
    });
  });

  spaceTest.beforeEach(async ({ context, browserAuth }) => {
    await enableElasticChartDebug(context);
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'courier:ignoreFilterIfFieldNotInIndex',
      'defaultIndex',
      'dateFormat:tz',
      'timepicker:timeDefaults'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  // Tests 1-3 form a sequential journey: build → filter → reopen with changed setting.
  // Combined into one test with test.step() per Scout migration guidance for chained FTR `it` blocks.
  spaceTest(
    'should allow building a multi-data-view chart and applying global filters',
    async ({ page, pageObjects, scoutSpace }) => {
      const { visualize, lens, filterBar } = pageObjects;

      await spaceTest.step('build multi-layer chart with logstash and flights layers', async () => {
        await visualize.goto();
        await visualize.openNewVisualizationWizard();
        await visualize.clickVisType('lens');
        await lens.waitForLensApp();

        // Logstash layer — switch data panel to long-window, click bytes
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.LONG_WINDOW_LOGSTASH);
        await page.testSubj.click('fieldToggle-bytes');

        // Flights layer — switch data panel first so the new layer inherits flights,
        // then add a line layer and toggle DistanceKilometers (matches FTR order).
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.FLIGHTS);
        await addDataLayer(page, 'line');
        await lens.activateLayerTab(1);
        await page.testSubj
          .locator('fieldToggle-DistanceKilometers')
          .waitFor({ state: 'visible', timeout: 30_000 });
        await page.testSubj.click('fieldToggle-DistanceKilometers');

        await lens.waitForVisualization('xyVisChart');
        await expect
          .poll(async () => getNonEmptyLineSeries(await getChartDebugData(page, 'xyVisChart')), {
            timeout: 30_000,
          })
          .toStrictEqual([EXPECTED_LOGSTASH_DATA, EXPECTED_FLIGHTS_DATA]);
      });

      await spaceTest.step(
        'ignores global filter on layer using a data view without the filter field',
        async () => {
          // Add a Carrier exists filter — Carrier is only in flights, so logstash should be unaffected
          await filterBar.addFilter({ field: 'Carrier', operator: 'exists' });

          await lens.waitForVisualization('xyVisChart');
          expect(getNonEmptyLineSeries(await getChartDebugData(page, 'xyVisChart'))).toStrictEqual([
            EXPECTED_LOGSTASH_DATA,
            EXPECTED_FLIGHTS_DATA,
          ]);

          await lens.save(VIS_TITLE, { addToDashboard: 'none' });
        }
      );

      await spaceTest.step(
        'applies global filter on layers using data view without the filter field when setting disabled',
        async () => {
          // Disable the ignore-missing-field setting: the Carrier filter now applies to logstash too,
          // which has no Carrier field, so the logstash layer returns empty data.
          await scoutSpace.uiSettings.set({
            'courier:ignoreFilterIfFieldNotInIndex': false,
          });

          await visualize.goto();
          // Lens editors do not use visualizationLoader; open the listing link then wait on Lens.
          await page.testSubj.click(`visListingTitleLink-${VIS_TITLE.split(' ').join('-')}`);
          await lens.waitForLensApp();
          await lens.waitForVisualization('xyVisChart');

          expect(getNonEmptyLineSeries(await getChartDebugData(page, 'xyVisChart'))).toStrictEqual([
            EXPECTED_FLIGHTS_DATA,
          ]);
        }
      );
    }
  );
});
