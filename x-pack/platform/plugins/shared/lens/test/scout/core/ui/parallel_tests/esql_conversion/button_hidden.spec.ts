/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { openInlineEditorAndWaitVisible, spaceTest, testData } from '../../fixtures';

spaceTest.describe('Lens Convert to ES|QL button', { tag: '@local-stateful-classic' }, () => {
  let dashboardId: string;
  let panelId: string;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.LOGSTASH_IN_RANGE_DATES.from,
        to: testData.LOGSTASH_IN_RANGE_DATES.to,
      }),
    });

    const body = {
      title: 'ES|QL conversion button hidden (default flag)',
      time_range: testData.LOGSTASH_IN_RANGE_DATES,
      panels: [
        {
          type: 'vis',
          grid: { x: 0, y: 0, w: 24, h: 12 },
          config: {
            type: 'metric',
            title: 'Average bytes',
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
              },
            ],
          },
        },
      ],
    };

    const result = await apiServices.dashboard.createWithPanelId(body, scoutSpace.id);
    dashboardId = result.dashboardId;
    panelId = result.panelId;
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'hides Convert to ES|QL when the conversion flag is off (default)',
    async ({ browserAuth, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await dashboard.openDashboardWithIdInEditMode(dashboardId);
      await dashboard.waitForPanelsToLoad(1);

      await openInlineEditorAndWaitVisible(pageObjects, panelId);
      await expect(lens.workspace.convertToEsqlButton).toBeHidden();
    }
  );
});
