/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  openSharedLensUrl,
  spaceTest,
  testData,
} from '../../fixtures';

const logstashDataSource = {
  type: 'data_view_spec' as const,
  index_pattern: testData.DATA_VIEW_ID.LOGSTASH,
  time_field: '@timestamp',
};

const dateHistogramX = {
  operation: 'date_histogram' as const,
  field: '@timestamp',
  suggested_interval: 'auto' as const,
  use_original_time_range: false,
  include_empty_rows: false,
};

/**
 * Two-layer XY used to assert inspector request count (setup only).
 * FTR built this chart via empty-dashboard → Create visualization → layers → Save and return.
 * That entry path is not under test here (and was flaky on Add → panel flyout), so we API-seed
 * the finished panel and only assert the inspector request chooser.
 */
function buildTwoLayerXyConfig(title: string): LensApiConfig {
  return {
    type: 'xy',
    title,
    layers: [
      {
        type: 'bar',
        ignore_global_filters: false,
        sampling: 1,
        data_source: logstashDataSource,
        x: dateHistogramX,
        y: [{ operation: 'average', field: 'bytes' }],
      },
      {
        type: 'line',
        ignore_global_filters: false,
        sampling: 1,
        data_source: logstashDataSource,
        x: dateHistogramX,
        y: [{ operation: 'median', field: 'bytes' }],
      },
    ],
  };
}

/**
 * Valid XY with a moving-average metric so the editor can drop the date histogram
 * and hit the Save-and-return validation error (assertion stays in the UI).
 * FTR reached this state from empty-dashboard → Create visualization; we API-seed
 * the chart and only cover remove-X → disabled Save and return.
 */
function buildMovingAverageXyConfig(title: string): LensApiConfig {
  return {
    type: 'xy',
    title,
    layers: [
      {
        type: 'bar',
        ignore_global_filters: false,
        sampling: 1,
        data_source: logstashDataSource,
        x: dateHistogramX,
        y: [
          {
            operation: 'moving_average',
            window: 5,
            of: { operation: 'sum', field: 'bytes', empty_as_null: true },
          },
        ],
      },
    ],
  };
}

spaceTest.describe('Lens editor from dashboard', { tag: '@local-stateful-classic' }, () => {
  // Inspector + validation cases API-seed Lens panels instead of empty-dashboard →
  // Create visualization. That UI entry is setup-only in FTR (not the assertion) and
  // was flaky; share-URL already used API seeding.
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    skipEmptyLensOpen: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'shows a request per layer in the dashboard inspector',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const { dashboard, inspector } = pageObjects;
      const panelTitle = `two-layer ${scoutSpace.id}`;

      const dashboardId = await apiServices.dashboard.create(
        {
          title: `lns-inspector-layers-${scoutSpace.id}-${Date.now()}`,
          time_range: testData.LOGSTASH_IN_RANGE_DATES,
          panels: [
            {
              type: LENS_EMBEDDABLE_TYPE,
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: buildTwoLayerXyConfig(panelTitle),
            },
          ],
        },
        scoutSpace.id
      );
      await dashboard.openDashboardWithId(dashboardId);
      await dashboard.waitForPanelsToLoad(1);
      await dashboard.waitForRenderComplete();

      await dashboard.clickPanelAction('embeddablePanelAction-openInspector');
      await inspector.panel.waitFor({ state: 'visible' });
      await inspector.openInspectorRequestsView();
      await inspector.requests.requestChooser.click();
      await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(2);
    }
  );

  spaceTest(
    'disables Save and return when the visualization has a validation error',
    async ({ apiServices, pageObjects, scoutSpace }) => {
      const { dashboard, lens } = pageObjects;
      const panelTitle = `moving-avg ${scoutSpace.id}`;

      const dashboardId = await apiServices.dashboard.create(
        {
          title: `lns-validation-${scoutSpace.id}-${Date.now()}`,
          time_range: testData.LOGSTASH_IN_RANGE_DATES,
          panels: [
            {
              type: LENS_EMBEDDABLE_TYPE,
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: buildMovingAverageXyConfig(panelTitle),
            },
          ],
        },
        scoutSpace.id
      );
      await dashboard.openDashboardWithIdInEditMode(dashboardId);
      await dashboard.waitForPanelsToLoad(1);

      await dashboard.navigateToLensEditorFromPanel(panelTitle);
      await lens.workspace.removeAllDimensions('lnsXY_xDimensionPanel');
      await expect(lens.saveAndReturnButton).toBeDisabled();
    }
  );

  spaceTest(
    'opens a by-value Lens chart from its share URL',
    async ({ apiServices, pageObjects, context, kbnUrl, scoutSpace }) => {
      const { dashboard, lens } = pageObjects;
      const visTitle = `by-value ${scoutSpace.id}`;

      const dashboardId = await apiServices.dashboard.create(
        {
          title: `lns-by-value-share-${scoutSpace.id}-${Date.now()}`,
          time_range: testData.LOGSTASH_IN_RANGE_DATES,
          panels: [
            {
              type: LENS_EMBEDDABLE_TYPE,
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: {
                type: 'xy',
                title: visTitle,
                layers: [
                  {
                    type: 'bar',
                    ignore_global_filters: false,
                    sampling: 1,
                    data_source: logstashDataSource,
                    y: [{ operation: 'average', field: 'bytes' }],
                  },
                ],
              },
            },
          ],
        },
        scoutSpace.id
      );
      await dashboard.openDashboardWithIdInEditMode(dashboardId);
      await dashboard.waitForPanelsToLoad(1);

      await dashboard.navigateToLensEditorFromPanel(visTitle);
      await lens.save(visTitle);
      await dashboard.waitForRenderComplete();

      await dashboard.navigateToLensEditorFromPanel(visTitle);
      const url = await lens.workspace.getSharedUrl();
      const { page: sharedPage } = await openSharedLensUrl({ context, kbnUrl, url });
      await expect(sharedPage.testSubj.locator('lns_ChartTitle')).toHaveText(visTitle);
    }
  );
});
