/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  convertToEsqlViaModal,
  openInlineEditorAndWaitVisible,
  test,
  testData,
} from '../../fixtures';

test.describe(
  'Lens metric trendline conversion to ES|QL',
  { tag: '@local-stateful-classic' },
  () => {
    let dashboardId: string;
    let panelId: string;

    test.beforeAll(async ({ esArchiver, uiSettings, apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'lens.enable_esql_conversion': true,
        },
      });

      await esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LOGSTASH);

      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify({
          from: testData.LOGSTASH_IN_RANGE_DATES.from,
          to: testData.LOGSTASH_IN_RANGE_DATES.to,
        }),
      });

      const body = {
        title: 'Metric trendline conversion test',
        time_range: testData.LOGSTASH_IN_RANGE_DATES,
        panels: [
          {
            type: 'vis',
            grid: { x: 0, y: 0, w: 24, h: 12 },
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

      const result = await apiServices.dashboard.createWithPanelId(body);
      dashboardId = result.dashboardId;
      panelId = result.panelId;
    });

    test.afterAll(async ({ uiSettings, kbnClient, apiServices }) => {
      await uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'lens.enable_esql_conversion': null,
        },
      });
    });

    test('trendline persists after converting form-based metric to ES|QL', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const { dashboard, lens } = pageObjects;

      await test.step('open dashboard and verify initial trendline', async () => {
        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openDashboardWithId(dashboardId);
        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect(lens.metric.trendline).toBeVisible();
      });

      await test.step('convert to ES|QL via inline editor', async () => {
        await dashboard.switchToEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);
        await convertToEsqlViaModal({ pageObjects, page });
      });

      await test.step('verify trendline renders after conversion', async () => {
        await expect(page.getByTestId('ESQLEditor')).toBeVisible();
        await expect(lens.metric.trendline).toBeVisible();
      });

      await test.step('apply changes and verify trendline persists', async () => {
        await applyLensInlineEditorAndWaitClosed({ lens });
        await expect(lens.metric.trendline).toBeVisible();
      });
    });
  }
);
