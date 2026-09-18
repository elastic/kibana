/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  openDiscoverFromPopup,
  spaceTest,
  testData,
} from '../../fixtures';

/*
 * FTR skipped `it`: Open in Discover from a Lens ES|QL dashboard panel; Discover's
 * ES|QL editor has that panel query. This spec keeps that purpose (API-seeded panel).
 *
 * Additional Open-in-Discover coverage (follow-up, not this spec):
 * https://github.com/elastic/kibana/issues/285093
 * - Full editor string equality (`from logs* | stats maxB = max(bytes)`), not only fragments
 * - Dashboard KQL/Lucene + translatable filters injected as ES|QL WHERE; Discover filter bar empty
 */
spaceTest.describe(
  'Lens show underlying data from ES|QL dashboard panel',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      skipEmptyLensOpen: true,
    });
    const esqlQuery = 'from logs* | stats maxB = max(bytes)';

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'opens Discover with the Lens ES|QL panel query',
      async ({ page, pageObjects, context, kbnUrl, scoutSpace, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const { dashboard } = pageObjects;
        const openInDiscoverAction = testData.DATA_TEST_SUBJECTS.OPEN_IN_DISCOVER_ACTION;

        await spaceTest.step('open a dashboard that already has an ES|QL stats panel', async () => {
          const dashboardId = await apiServices.dashboard.create(
            {
              title: `ESQL Open in Discover ${scoutSpace.id}-${Date.now()}`,
              panels: [
                {
                  type: 'vis',
                  grid: { x: 0, y: 0, w: 12, h: 8 },
                  config: {
                    type: 'metric',
                    title: 'ESQL max bytes',
                    data_source: {
                      type: 'esql',
                      query: esqlQuery,
                    },
                    metrics: [
                      {
                        type: 'primary',
                        column: 'maxB',
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
          await expect(page.testSubj.locator('mtrVis')).toBeVisible();
        });

        await spaceTest.step('switch the dashboard to view mode', async () => {
          await dashboard.clickCancelOutOfEditMode();
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step(
          'open Discover from the panel and assert the ES|QL query',
          async () => {
            await dashboard.openPanelContextMenu();
            await expect(page.testSubj.locator(openInDiscoverAction)).toBeVisible();

            const discoverPage = await openDiscoverFromPopup({
              context,
              kbnUrl,
              click: () => page.testSubj.click(openInDiscoverAction),
            });
            const discoverEditor = new KibanaCodeEditorWrapper(discoverPage);

            await expect(discoverPage.testSubj.locator('ESQLEditor')).toBeVisible();
            await discoverEditor.waitCodeEditorReady('ESQLEditor');
            await expect(discoverEditor.getCodeEditorContent()).toContainText('from logs*');
            await expect(discoverEditor.getCodeEditorContent()).toContainText('maxB = max(bytes)');
          }
        );
      }
    );
  }
);
