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
import { addDataLayer, switchDataPanelIndexPattern, testData } from '../fixtures';

const VIS_TITLE = 'xyChart with multiple data views';

function getNonEmptyLineSeriesCount(state: DebugState): number {
  return state.lines?.filter((series) => series.points.length > 0).length ?? 0;
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
        await lens.openFullEditor();

        // Logstash layer — switch data panel to long-window, click bytes
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.LONG_WINDOW_LOGSTASH);
        await page.testSubj.click('fieldToggle-bytes');

        // Flights layer — switch data panel first so the new layer inherits flights,
        // then add a line layer and toggle DistanceKilometers (matches FTR order).
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.FLIGHTS);
        await addDataLayer(page, 'line');
        await lens.activateLayerTab(1);
        await page.testSubj.locator('fieldToggle-DistanceKilometers').waitFor({ state: 'visible' });
        await page.testSubj.click('fieldToggle-DistanceKilometers');

        await lens.waitForVisualization('xyVisChart');
        // Two non-empty series (logstash + flights). Exact bucket values belong at the API layer.
        await expect
          .poll(async () => getNonEmptyLineSeriesCount(await getChartDebugData(page, 'xyVisChart')))
          .toBe(2);
      });

      await spaceTest.step(
        'ignores global filter on layer using a data view without the filter field',
        async () => {
          // Add a Carrier exists filter — Carrier is only in flights, so logstash should be unaffected
          await filterBar.addFilter({ field: 'Carrier', operator: 'exists' });

          await lens.waitForVisualization('xyVisChart');
          await expect
            .poll(async () =>
              getNonEmptyLineSeriesCount(await getChartDebugData(page, 'xyVisChart'))
            )
            .toBe(2);

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

          // Only the flights series remains non-empty.
          await expect
            .poll(async () =>
              getNonEmptyLineSeriesCount(await getChartDebugData(page, 'xyVisChart'))
            )
            .toBe(1);
        }
      );
    }
  );
});
