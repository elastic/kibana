/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { applyLensInlineEditorAndWaitClosed, spaceTest, testData } from '../fixtures';

const INITIAL_ESQL_QUERY = `FROM ${testData.KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX}
  | STATS count = COUNT(*) BY \`Over time\` = TBUCKET(50), agent.keyword`;

const WILDCARD_ESQL_QUERY = `FROM ${testData.KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX}*
  | STATS count = COUNT(*) BY \`Over time\` = TBUCKET(50), agent.keyword`;

async function setEsqlQueryAndRun(page: ScoutPage, query: string) {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
  await codeEditor.setCodeEditorValue(query);
  await page.testSubj.click('ESQLEditor-run-query-button');
  await page.locator('.echCanvasRenderer').waitFor({ state: 'visible', timeout: 30_000 });
}

spaceTest.describe(
  'Lens ES|QL filter data view selector',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.dataViews.create({
        title: testData.DATA_VIEW_ID.FLIGHTS,
        name: testData.DATA_VIEW_ID.FLIGHTS,
        timeFieldName: 'timestamp',
        spaceId: scoutSpace.id,
      });
      await scoutSpace.uiSettings.set({
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify(testData.TSDB_IN_RANGE_DATES),
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'dashboard add filter from ES|QL panel should not show duplicate data view names',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;
        let esqlEmbeddableId: string;

        await spaceTest.step('create a new dashboard with an ES|QL panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewESQLPanel();

          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
        });

        await spaceTest.step('set the ESQL query and apply', async () => {
          await setEsqlQueryAndRun(page, WILDCARD_ESQL_QUERY);
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
          // Capture the ES|QL panel ID while it's the only panel on the dashboard
          const panelElementId = await page.testSubj.locator('dashboardPanel').getAttribute('id');
          esqlEmbeddableId = panelElementId!.replace('panel-', '');
        });

        await spaceTest.step('add a Lens chart panel using flights data view', async () => {
          await dashboard.addNewLensPanel();
          await expect(page.testSubj.locator('lnsApp')).toBeVisible();

          await page.testSubj.click('lns-dataView-switch-link');
          await page.testSubj.fill('indexPattern-switcher--input', testData.DATA_VIEW_ID.FLIGHTS);
          await page.testSubj
            .locator('indexPattern-switcher')
            .locator(`[data-test-subj="dataView-${testData.DATA_VIEW_ID.FLIGHTS}"]`)
            .click();

          await expect(page.testSubj.locator('fieldListLoading')).toBeHidden({ timeout: 10_000 });
          await page.testSubj.click('fieldToggle-AvgTicketPrice');
          await pageObjects.lens.saveAndReturn();
          await dashboard.waitForRenderComplete();
          await dashboard.expectPanelCount(2);
        });

        await spaceTest.step('click on a chart coordinate to trigger a filter', async () => {
          const canvas = page.locator(
            `[data-test-embeddable-id="${esqlEmbeddableId}"] .echCanvasRenderer`
          );
          await canvas.waitFor({ state: 'visible' });
          const box = (await canvas.boundingBox())!;
          await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
        });

        await spaceTest.step('wait for the filter badge to appear', async () => {
          await expect(page.testSubj.locator('^filter-badge')).toBeVisible({ timeout: 10_000 });
        });

        await spaceTest.step('open the filter editor', async () => {
          await page.testSubj.locator('~filter').click();
          await page.testSubj.click('editFilter');
        });

        await spaceTest.step('verify data view selector has no duplicate names', async () => {
          await expect(page.testSubj.locator('filterIndexPatternsSelect')).toBeVisible({
            timeout: 5_000,
          });

          const allOptionTexts = await page.components
            .comboBox('filterIndexPatternsSelect')
            .getAllVisibleOptions();
          expect(allOptionTexts.length).toBeGreaterThan(0);
          expect(allOptionTexts).toHaveLength(new Set(allOptionTexts).size);
        });
      }
    );

    spaceTest(
      'filter fields should be available after changing ES|QL query source',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await spaceTest.step('create a new dashboard with an ES|QL panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewESQLPanel();
          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
        });

        await spaceTest.step('set the initial ESQL query and apply', async () => {
          await setEsqlQueryAndRun(page, INITIAL_ESQL_QUERY);
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('reopen the inline editor and change the query', async () => {
          const esqlPanel = page.testSubj
            .locator('dashboardPanel')
            .filter({ has: page.locator('.echCanvasRenderer') });
          const panelElementId = await esqlPanel.getAttribute('id');
          const embeddableId = panelElementId!.replace('panel-', '');

          await dashboard.openInlineEditor(embeddableId);
          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();

          await setEsqlQueryAndRun(page, WILDCARD_ESQL_QUERY);
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('open add filter and verify fields are available', async () => {
          await page.testSubj.click('addFilter');
          await expect(page.testSubj.locator('addFilterPopover')).toBeVisible();

          const fieldOptions = await page.components
            .comboBox('filterFieldSuggestionList')
            .getAllVisibleOptions();
          expect(fieldOptions.length).toBeGreaterThan(0);
        });
      }
    );
  }
);
