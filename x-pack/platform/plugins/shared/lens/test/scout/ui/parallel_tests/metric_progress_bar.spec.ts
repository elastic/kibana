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
  'Lens metric progress bar on dashboard (DSL)',
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
        name: `scout-metric-progress-bar-dv-${Date.now()}`,
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
      'renders vertical progress bar on dashboard',
      async ({ apiServices, browserAuth, page, pageObjects, scoutSpace }) => {
        spaceTest.fail(!storedDataViewId, 'Stored data view was not created in beforeAll');

        const dashboardId = await apiServices.dashboard.create(
          {
            title: 'Metric progress bar vertical',
            time_range: testData.LOGSTASH_IN_RANGE_DATES,
            panels: [
              {
                type: 'vis',
                grid: { x: 0, y: 0, w: 12, h: 8 },
                config: {
                  type: 'metric',
                  title: 'Average bytes with progress bar',
                  data_source: {
                    type: 'data_view_reference',
                    ref_id: storedDataViewId!,
                  },
                  metrics: [
                    {
                      type: 'primary',
                      operation: 'average',
                      field: 'bytes',
                      background_chart: {
                        type: 'bar',
                        max_value: { operation: 'max', field: 'bytes' },
                      },
                    },
                  ],
                },
              },
            ],
          },
          scoutSpace.id
        );

        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
        await pageObjects.dashboard.waitForPanelsToLoad(1);
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

        const metricVis = page.getByTestId('mtrVis');
        await expect(metricVis).toBeVisible();

        await expect(page.locator('.echSingleMetricProgress--vertical')).toBeVisible();

        await expect(page.getByRole('meter')).toBeVisible();
      }
    );

    spaceTest(
      'renders horizontal progress bar on dashboard',
      async ({ apiServices, browserAuth, page, pageObjects, scoutSpace }) => {
        spaceTest.fail(!storedDataViewId, 'Stored data view was not created in beforeAll');

        const dashboardId = await apiServices.dashboard.create(
          {
            title: 'Metric progress bar horizontal',
            time_range: testData.LOGSTASH_IN_RANGE_DATES,
            panels: [
              {
                type: 'vis',
                grid: { x: 0, y: 0, w: 12, h: 8 },
                config: {
                  type: 'metric',
                  title: 'Average bytes horizontal bar',
                  data_source: {
                    type: 'data_view_reference',
                    ref_id: storedDataViewId!,
                  },
                  metrics: [
                    {
                      type: 'primary',
                      operation: 'average',
                      field: 'bytes',
                      background_chart: {
                        type: 'bar',
                        orientation: 'horizontal',
                        max_value: { operation: 'max', field: 'bytes' },
                      },
                    },
                  ],
                },
              },
            ],
          },
          scoutSpace.id
        );

        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
        await pageObjects.dashboard.waitForPanelsToLoad(1);
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

        const metricVis = page.getByTestId('mtrVis');
        await expect(metricVis).toBeVisible();

        await expect(page.locator('.echSingleMetricProgress--horizontal')).toBeVisible();

        await expect(page.getByRole('meter')).toBeVisible();
      }
    );

    spaceTest(
      'does not render progress bar when max value is not configured',
      async ({ apiServices, browserAuth, page, pageObjects, scoutSpace }) => {
        spaceTest.fail(!storedDataViewId, 'Stored data view was not created in beforeAll');

        const dashboardId = await apiServices.dashboard.create(
          {
            title: 'Metric without progress bar',
            time_range: testData.LOGSTASH_IN_RANGE_DATES,
            panels: [
              {
                type: 'vis',
                grid: { x: 0, y: 0, w: 12, h: 8 },
                config: {
                  type: 'metric',
                  title: 'Average bytes only',
                  data_source: {
                    type: 'data_view_reference',
                    ref_id: storedDataViewId!,
                  },
                  metrics: [
                    {
                      type: 'primary',
                      operation: 'average',
                      field: 'bytes',
                    },
                  ],
                },
              },
            ],
          },
          scoutSpace.id
        );

        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
        await pageObjects.dashboard.waitForPanelsToLoad(1);
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

        const metricVis = page.getByTestId('mtrVis');
        await expect(metricVis).toBeVisible();
        await expect(page.locator('.echSingleMetricProgress')).toHaveCount(0);
        await expect(page.getByRole('meter')).toHaveCount(0);
      }
    );
  }
);
