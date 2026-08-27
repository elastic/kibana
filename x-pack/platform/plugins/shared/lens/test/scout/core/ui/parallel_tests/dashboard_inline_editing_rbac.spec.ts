/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { ApiServicesFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../fixtures';

const SHOW_CONFIG_ACTION = 'embeddablePanelAction-ACTION_SHOW_CONFIG_PANEL';

/** Creates a dashboard with one by-value Lens panel via the dashboard API. */
async function createDashboardWithLensPanel(
  apiServices: ApiServicesFixture,
  spaceId: string,
  title: string
): Promise<string> {
  return apiServices.dashboard.create(
    {
      title,
      time_range: {
        from: testData.LOGSTASH_IN_RANGE_DATES.from,
        to: testData.LOGSTASH_IN_RANGE_DATES.to,
        mode: 'absolute' as const,
      },
      panels: [
        {
          type: LENS_EMBEDDABLE_TYPE,
          grid: { x: 0, y: 0, w: 36, h: 20 },
          config: {
            type: 'xy' as const,
            title: 'RBAC test panel',
            layers: [
              {
                type: 'line' as const,
                ignore_global_filters: false,
                sampling: 1,
                data_source: {
                  type: 'esql' as const,
                  query:
                    'FROM logstash-* | STATS count = COUNT(*) BY ts = BUCKET(@timestamp, 1 hour)',
                },
                x: { column: 'ts' },
                y: [{ column: 'count' }],
              },
            ],
          },
        },
      ],
    },
    spaceId
  );
}

spaceTest.describe(
  'Lens dashboard inline editing - show config RBAC',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      // Tests start from API-created dashboards, not an empty Lens editor.
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);
    spaceTest.beforeEach(suiteSetup.beforeEach);
    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'hides the show-config action for a user with write access',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dashboard } = pageObjects;
        let dashboardId = '';

        await spaceTest.step('create a dashboard with a Lens panel via API', async () => {
          // API setup (instead of the FTR UI build flow) keeps this test focused
          // on the action-visibility assertion; the panel is by-value, matching FTR.
          dashboardId = await createDashboardWithLensPanel(
            apiServices,
            scoutSpace.id,
            'My read only testing dashboard'
          );
        });

        await spaceTest.step('the action is absent in edit mode', async () => {
          await dashboard.openDashboardWithIdInEditMode(dashboardId);
          expect(await dashboard.panelHasAction(SHOW_CONFIG_ACTION)).toBe(false);
        });

        await spaceTest.step('the action is absent in view mode', async () => {
          // Not `dashboard.ensureViewMode()`: its post-condition (Edit button hidden) only
          // holds when exiting an unsaved dashboard; a saved dashboard shows the Edit
          // button in view mode.
          await page.testSubj.click('dashboardViewOnlyMode');
          await expect(page.testSubj.locator('dashboardEditMode')).toBeVisible();
          expect(await dashboard.panelHasAction(SHOW_CONFIG_ACTION)).toBe(false);
        });
      }
    );

    spaceTest(
      'shows the show-config action for a read-only user',
      async ({ apiServices, browserAuth, pageObjects, scoutSpace }) => {
        const { dashboard } = pageObjects;
        let dashboardId = '';

        await spaceTest.step('create a dashboard with a Lens panel via API', async () => {
          // API setup (instead of FTR's UI build under a write user) keeps this test
          // independent of the write-access test above.
          dashboardId = await createDashboardWithLensPanel(
            apiServices,
            scoutSpace.id,
            'My read only testing dashboard (viewer)'
          );
        });

        await spaceTest.step('the action is available to a viewer', async () => {
          await browserAuth.loginAsViewer();
          await dashboard.openDashboardWithId(dashboardId);
          expect(await dashboard.panelHasAction(SHOW_CONFIG_ACTION)).toBe(true);
        });
      }
    );
  }
);
