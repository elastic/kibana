/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { testData } from '../fixtures';

const INSPECTOR_PAGE_SIZE = 10;

spaceTest.describe('Lens inspector pagination', { tag: tags.stateful.classic }, () => {
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
      const includeEmptyRows = page.getByTestId('indexPattern-include-empty-rows');
      await expect(includeEmptyRows).toHaveAttribute('aria-checked', 'false');
      await includeEmptyRows.click();
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
      await inspector.setTablePageSize(INSPECTOR_PAGE_SIZE);

      const pageOneRows = await inspector.getTableData();
      expect(pageOneRows).toHaveLength(INSPECTOR_PAGE_SIZE);

      await page.testSubj.click('pagination-button-1');
      const pageTwoRows = await inspector.getTableData();
      expect(pageTwoRows).toHaveLength(INSPECTOR_PAGE_SIZE);
      expect(pageTwoRows).not.toStrictEqual(pageOneRows);
    }
  );
});
