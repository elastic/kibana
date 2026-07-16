/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { enableElasticChartDebug, getChartDebugData } from '../fixtures/open_in_lens_helpers';
import { addDataLayer, switchDataPanelIndexPattern } from '../fixtures';
import { testData } from '../fixtures';

const VIS_TITLE = 'xyChart with multiple data views';

spaceTest.describe('Lens with multiple data views', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(
      testData.KBN_ARCHIVE_PATHS.LONG_WINDOW_LOGSTASH_INDEX_PATTERN
    );
    await scoutSpace.savedObjects.load(
      testData.KBN_ARCHIVE_PATHS.KIBANA_SAMPLE_DATA_FLIGHTS_INDEX_PATTERN
    );

    await scoutSpace.uiSettings.set({
      'courier:ignoreFilterIfFieldNotInIndex': 'true',
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
      const { visualize, lens } = pageObjects;

      await spaceTest.step('build multi-layer chart with logstash and flights layers', async () => {
        await visualize.goto();
        await visualize.openNewVisualizationWizard();
        await visualize.clickVisType('lens');
        await lens.waitForLensApp();

        // Logstash layer — switch data panel to long-window, click bytes
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.LONG_WINDOW_LOGSTASH);
        await page.testSubj.click('fieldToggle-bytes');

        // Flights layer — switch data panel to flights, add new layer, click DistanceKilometers
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.FLIGHTS);
        await addDataLayer(page);
        await page.testSubj.click('fieldToggle-DistanceKilometers');

        await lens.waitForVisualization('xyVisChart');
        const data = await getChartDebugData(page, 'xyVisChart');
        // Both layers must have data (exact values not asserted per plan §1b)
        const nonEmptySeries = [
          ...(data.lines?.filter((l) => l.points.length > 0) ?? []),
          ...(data.bars?.filter((b) => b.bars.length > 0) ?? []),
        ];
        expect(nonEmptySeries).toHaveLength(2);
      });

      await spaceTest.step(
        'ignores global filter on layer using a data view without the filter field',
        async () => {
          // Add a Carrier exists filter — Carrier is only in flights, so logstash should be unaffected
          await page.testSubj.click('addFilter');
          await page.testSubj.waitForSelector('addFilterPopover');
          await page.testSubj.typeWithDelay(
            'filterFieldSuggestionList > comboBoxSearchInput',
            'Carrier'
          );
          await page.testSubj.click('filterFieldOption-Carrier');
          await page.testSubj.typeWithDelay('filterOperatorList > comboBoxSearchInput', 'exists');
          await page.testSubj.click('filterOperatorOption-exists');
          await page.testSubj.click('saveFilter');
          await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });

          await lens.waitForVisualization('xyVisChart');
          const data = await getChartDebugData(page, 'xyVisChart');
          const nonEmptySeries = [
            ...(data.lines?.filter((l) => l.points.length > 0) ?? []),
            ...(data.bars?.filter((b) => b.bars.length > 0) ?? []),
          ];
          // Both layers still have data; logstash was unaffected by the Carrier filter
          expect(nonEmptySeries).toHaveLength(2);

          await lens.save(VIS_TITLE);
        }
      );

      await spaceTest.step(
        'applies global filter on layers using data view without the filter field when setting disabled',
        async () => {
          // Disable the ignore-missing-field setting: the Carrier filter now applies to logstash too,
          // which has no Carrier field, so the logstash layer returns empty data.
          await scoutSpace.uiSettings.set({
            'courier:ignoreFilterIfFieldNotInIndex': 'false',
          });

          await visualize.goto();
          await visualize.openSavedVisualization(VIS_TITLE);
          await lens.waitForVisualization('xyVisChart');

          const data = await getChartDebugData(page, 'xyVisChart');
          const nonEmptySeries = [
            ...(data.lines?.filter((l) => l.points.length > 0) ?? []),
            ...(data.bars?.filter((b) => b.bars.length > 0) ?? []),
          ];
          // Only the flights layer should have data now
          expect(nonEmptySeries).toHaveLength(1);
        }
      );
    }
  );
});
