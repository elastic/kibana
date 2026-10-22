/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';
const MAP_EMBEDDABLE_EXAMPLE_DASHBOARD_ID = '19906970-2e40-11e9-85cb-6965aae20f13';
const JOIN_EXAMPLE = 'join example';
const GEO_GRID_EXAMPLE = 'geo grid vector grid example';

test.describe('Maps - embed in dashboard', { tag: '@local-stateful-classic' }, () => {
  let prevDefaultIndex: string | number | boolean | undefined;

  test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
    prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
    await kbnClient.importExport.load(KBN_ARCHIVE);
    await uiSettings.set({
      defaultIndex: DEFAULT_INDEX_ID,
      [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: true,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithId(MAP_EMBEDDABLE_EXAMPLE_DASHBOARD_ID);
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await uiSettings.unset(UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX);
    if (prevDefaultIndex !== undefined) {
      await uiSettings.set({ defaultIndex: prevDefaultIndex });
    } else {
      await uiSettings.unset('defaultIndex');
    }
  });

  /** Opens the panel's inspector, reads the (optionally named) request's raw response, then closes it. */
  const getPanelResponse = async (
    { dashboard, inspector }: PageObjects,
    page: ScoutPage,
    panelTitle: string,
    requestName?: string
  ) => {
    await dashboard.openInspector(panelTitle);
    try {
      await inspector.openInspectorRequestsView();
      if (requestName) {
        await page.components.comboBox('inspectorRequestChooser').setSelectedOptions([requestName]);
      }
      const { rawResponse } = await inspector.getResponse();
      return rawResponse;
    } finally {
      await inspector.close();
    }
  };

  const getPanelRequestTimestamp = async (
    { dashboard, inspector }: PageObjects,
    panelTitle: string
  ) => {
    await dashboard.openInspector(panelTitle);
    try {
      await inspector.openInspectorRequestsView();
      await inspector.openRequestsStatisticsTab();
      return await inspector.getRequestTimestamp();
    } finally {
      await inspector.close();
    }
  };

  /** Opens the panel's inspector and expects its request chooser to list exactly `requestNames`. */
  const expectPanelRequestNames = async (
    { dashboard, inspector }: PageObjects,
    panelTitle: string,
    requestNames: string[]
  ) => {
    await dashboard.openInspector(panelTitle);
    try {
      await inspector.openInspectorRequestsView();
      await expect.poll(() => inspector.getRequestNames()).toStrictEqual(requestNames);
    } finally {
      await inspector.close();
    }
  };

  test('should render map embeddables', async ({ page, pageObjects }) => {
    await test.step('should set "data-title" attribute', async () => {
      await expect(page.locator(`[data-shared-item][data-title="${JOIN_EXAMPLE}"]`)).toBeVisible();
    });

    await test.step('should display tools control', async () => {
      await expect(
        page
          .locator(`[data-shared-item][data-title="${JOIN_EXAMPLE}"]`)
          .getByTestId('mapToolsControlPopover')
      ).toBeVisible();
    });

    await test.step('should populate inspector with requests for join example', async () => {
      await expectPanelRequestNames(pageObjects, JOIN_EXAMPLE, [
        'load layer features (geo_shapes*)',
        'load join metrics (geo_shapes*)',
      ]);
    });

    await test.step('should populate inspector with a single request for geo grid example', async () => {
      await expectPanelRequestNames(pageObjects, GEO_GRID_EXAMPLE, [
        'load layer features (logstash-*)',
      ]);
    });

    await test.step('should apply container state (time, query, filters) to embeddable', async () => {
      const response = await getPanelResponse(pageObjects, page, GEO_GRID_EXAMPLE);
      expect(response.aggregations.gridSplit.buckets).toHaveLength(6);
    });

    await test.step('should pass index patterns to container', async () => {
      await page.testSubj.click('addFilter');
      const dataViews = await page.components
        .comboBox('filterIndexPatternsSelect')
        .getAllVisibleOptions();
      expect(dataViews.join(',')).toBe('meta_for_geo_shapes*,logstash-*');
    });
  });

  test('should apply filters added to the dashboard filter bar to map panels', async ({
    page,
    pageObjects,
  }) => {
    const { dashboard, filterBar } = pageObjects;

    await filterBar.addFilter({
      dataView: 'logstash-*',
      field: 'machine.os',
      operator: 'is',
      value: 'win 8',
    });
    await dashboard.waitForRenderComplete();

    await filterBar.addFilter({
      dataView: 'meta_for_geo_shapes*',
      field: 'shape_name',
      operator: 'is',
      value: 'alpha',
    });
    await dashboard.waitForRenderComplete();

    await expect
      .poll(async () => {
        const response = await getPanelResponse(pageObjects, page, GEO_GRID_EXAMPLE);
        return response.aggregations.gridSplit.buckets.length;
      })
      .toBe(1);

    await expect
      .poll(async () => {
        const response = await getPanelResponse(
          pageObjects,
          page,
          JOIN_EXAMPLE,
          'load join metrics (geo_shapes*)'
        );
        return response.aggregations.join.buckets.length;
      })
      .toBe(1);
  });

  test('should apply filters saved in the map panel itself', async ({ page, pageObjects }) => {
    const { dashboard, filterBar, maps } = pageObjects;

    await dashboard.switchToEditMode();
    await dashboard.clickPanelAction('embeddablePanelAction-editPanel', GEO_GRID_EXAMPLE);
    await maps.waitForLayersToLoad();

    await filterBar.addFilter({ field: 'machine.os', operator: 'is', value: 'ios' });
    await maps.waitForLayersToLoad();
    await maps.saveAndReturnButton.click();
    await dashboard.waitForRenderComplete();

    await expect
      .poll(async () => {
        const response = await getPanelResponse(pageObjects, page, GEO_GRID_EXAMPLE);
        return response.aggregations.gridSplit.buckets.length;
      })
      .toBe(2);
  });

  test('should re-fetch documents on refresh', async ({ page, pageObjects }) => {
    await test.step('when "refresh" is clicked', async () => {
      const before = await getPanelRequestTimestamp(pageObjects, GEO_GRID_EXAMPLE);
      await pageObjects.dashboard.refresh();
      await pageObjects.dashboard.waitForRenderComplete();
      await expect
        .poll(() => getPanelRequestTimestamp(pageObjects, GEO_GRID_EXAMPLE))
        .not.toBe(before);
    });

    await test.step('with refresh timer', async () => {
      let before = '';
      await expect
        .poll(async () => {
          before = await getPanelRequestTimestamp(pageObjects, GEO_GRID_EXAMPLE);
          return before.length;
        })
        .toBe(24);

      // let the 1s auto-refresh timer fire at least once, then pause it
      await pageObjects.datePicker.startAutoRefresh(1);
      await page.waitForTimeout(1500);
      await pageObjects.datePicker.pauseAutoRefresh();
      await pageObjects.dashboard.waitForRenderComplete();

      await expect
        .poll(() => getPanelRequestTimestamp(pageObjects, GEO_GRID_EXAMPLE))
        .not.toBe(before);
    });
  });
});
