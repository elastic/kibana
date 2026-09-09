/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { enableElasticChartDebug, spaceTest, testData } from '../fixtures';

const ESQL_QUERY = 'from logstash-* | stats averageB = avg(bytes) by extension';

spaceTest.describe(
  'Lens ES|QL dashboard handoff from Discover',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify(testData.LOGSTASH_IN_RANGE_DATES),
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'saves a Discover ES|QL visualization to a new dashboard',
      async ({ page, pageObjects }) => {
        const { dashboard, discover } = pageObjects;
        const visualizationTitle = 'Discover ES|QL chart';

        await discover.goto({ queryMode: 'esql' });
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitEsqlQuery(ESQL_QUERY);
        await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

        await discover.saveVisualizationToNewDashboard(visualizationTitle);
        await dashboard.waitForRenderComplete();
        await expect(
          page.testSubj.locator(`embeddablePanelHeading-${visualizationTitle}`)
        ).toBeVisible();
      }
    );

    spaceTest(
      'changes dimensions in the Discover ES|QL Lens flyout',
      async ({ context, pageObjects }) => {
        const { discover, lens } = pageObjects;

        await enableElasticChartDebug(context);
        await discover.goto({ queryMode: 'esql' });
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitEsqlQuery(ESQL_QUERY);
        await discover.openLensEditFlyout();

        await lens.workspace.removeAllDimensions('lnsXY_xDimensionPanel');
        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'extension',
        });

        await expect
          .poll(
            async () =>
              (await lens.workspace.getCurrentChartDebugState('xyVisChart')).legend?.items
                .map((item) => item.name)
                .sort(),
            { timeout: 20_000 }
          )
          .toStrictEqual(['css', 'gif', 'jpg', 'php', 'png']);
      }
    );
  }
);
