/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';

spaceTest.describe(
  'Lens metric trendline on dashboard (DSL)',
  { tag: tags.stateful.classic },
  () => {
    let storedDataViewId: string | undefined;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify({
          from: testData.LOGSTASH_IN_RANGE_DATES.from,
          to: testData.LOGSTASH_IN_RANGE_DATES.to,
        }),
      });

      const { data: dataView } = await apiServices.dataViews.create({
        title: testData.DATA_VIEW_ID.LOGSTASH,
        name: `scout-metric-trendline-dv-${Date.now()}`,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      storedDataViewId = dataView.id;
    });

    spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
      if (storedDataViewId) {
        await apiServices.dataViews.delete(storedDataViewId, scoutSpace.id);
      }
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'renders trendline when panel uses inline data view spec',
      async ({ apiServices, browserAuth, page, pageObjects, scoutSpace }) => {
        const body = {
          title: 'Metric trendline spec',
          time_range: testData.LOGSTASH_IN_RANGE_DATES,
          panels: [
            {
              type: 'vis',
              grid: { x: 0, y: 0, w: 12, h: 8 },
              config: {
                type: 'metric',
                title: 'Average bytes with trend',
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: testData.DATA_VIEW_ID.LOGSTASH,
                  time_field: '@timestamp',
                },
                metrics: [
                  {
                    type: 'primary',
                    operation: 'average',
                    field: 'bytes',
                    background_chart: { type: 'trend' },
                  },
                ],
              },
            },
          ],
        };

        const dashboardId = await apiServices.dashboard.create(body, scoutSpace.id);
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
      }
    );

    spaceTest(
      'renders trendline when panel uses stored data view reference',
      async ({ apiServices, browserAuth, page, pageObjects, scoutSpace }) => {
        spaceTest.fail(!storedDataViewId, 'Stored data view was not created in beforeAll');

        const body = {
          title: 'Metric trendline ref',
          time_range: testData.LOGSTASH_IN_RANGE_DATES,
          panels: [
            {
              type: 'vis',
              grid: { x: 0, y: 0, w: 12, h: 8 },
              config: {
                type: 'metric',
                title: 'Average bytes with trend',
                data_source: {
                  type: 'data_view_reference',
                  ref_id: storedDataViewId!,
                },
                metrics: [
                  {
                    type: 'primary',
                    operation: 'average',
                    field: 'bytes',
                    background_chart: { type: 'trend' },
                  },
                ],
              },
            },
          ],
        };

        const dashboardId = await apiServices.dashboard.create(body, scoutSpace.id);
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
      }
    );
  }
);
