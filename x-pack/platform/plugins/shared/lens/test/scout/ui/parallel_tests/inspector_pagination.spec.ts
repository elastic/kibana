/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NULL_LABEL } from '@kbn/field-formats-common';
import { spaceTest, tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { testData } from '../fixtures';

const PAGE_ONE_ROWS = [
  ['BT', '2015-09-19 06:00', NULL_LABEL],
  ['BT', '2015-09-19 09:00', NULL_LABEL],
  ['BT', '2015-09-19 12:00', NULL_LABEL],
  ['BT', '2015-09-19 15:00', NULL_LABEL],
  ['BT', '2015-09-19 18:00', NULL_LABEL],
  ['BT', '2015-09-19 21:00', NULL_LABEL],
  ['BT', '2015-09-20 00:00', NULL_LABEL],
  ['BT', '2015-09-20 03:00', NULL_LABEL],
  ['BT', '2015-09-20 06:00', NULL_LABEL],
  ['BT', '2015-09-20 09:00', NULL_LABEL],
] as const;

const PAGE_TWO_ROWS = [
  ['BT', '2015-09-20 12:00', NULL_LABEL],
  ['BT', '2015-09-20 15:00', NULL_LABEL],
  ['BT', '2015-09-20 18:00', NULL_LABEL],
  ['BT', '2015-09-20 21:00', NULL_LABEL],
  ['BT', '2015-09-21 00:00', NULL_LABEL],
  ['BT', '2015-09-21 03:00', NULL_LABEL],
  ['BT', '2015-09-21 06:00', NULL_LABEL],
  ['BT', '2015-09-21 09:00', NULL_LABEL],
  ['BT', '2015-09-21 12:00', NULL_LABEL],
  ['BT', '2015-09-21 15:00', NULL_LABEL],
] as const;

async function setEuiSwitchChecked(page: ScoutPage, testSubj: string, checked: boolean) {
  const switchLocator = page.getByTestId(testSubj);
  const isChecked = (await switchLocator.getAttribute('aria-checked')) === 'true';
  if (isChecked !== checked) {
    await switchLocator.click();
  }
}

spaceTest.describe('Lens inspector pagination', { tag: tags.stateful.classic  }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.LOGSTASH_IN_RANGE_DATES.from,
        to: testData.LOGSTASH_IN_RANGE_DATES.to,
      }),
    });

    await apiServices.dataViews.create({
      title: testData.DATA_VIEW_ID.LOGSTASH,
      name: `scout-inspector-pagination-dv-${Date.now()}`,
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should allow switching between inspector table pages',
    async ({ browserAuth, page, pageObjects }) => {
      const { lens, visualize } = pageObjects;
      const inspector = new Inspector(page);

      await browserAuth.loginAsPrivilegedUser();
      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        keepOpen: true,
      });

      // Bar charts default "Include empty rows" off; keep the empty buckets so this
      // pagination check still has two full pages of rows to page through.
      await setEuiSwitchChecked(page, 'indexPattern-include-empty-rows', true);
      await lens.closeDimensionEditor();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await inspector.open('lnsApp_inspectButton');
      await inspector.setTablePageSize(10);
      expect(await inspector.getTableData()).toEqual(PAGE_ONE_ROWS.map((r) => [...r]));

      await page.testSubj.click('pagination-button-1');
      expect(await inspector.getTableData()).toEqual(PAGE_TWO_ROWS.map((r) => [...r]));
    }
  );
});
