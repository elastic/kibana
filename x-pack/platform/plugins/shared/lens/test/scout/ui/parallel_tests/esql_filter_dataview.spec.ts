/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const INITIAL_ESQL_QUERY = `FROM kibana_sample_data_logs
  | STATS count = COUNT(*) BY \`Over time\` = TBUCKET(50), agent.keyword`;

const WILDCARD_ESQL_QUERY = `FROM kibana_sample_data_log*
  | STATS count = COUNT(*) BY \`Over time\` = TBUCKET(50), agent.keyword`;

spaceTest.describe(
  'Lens ES|QL filter data view selector',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await Promise.all([
        apiServices.sampleData.install('logs', scoutSpace.id),
        apiServices.sampleData.install('flights', scoutSpace.id),
      ]);
      await scoutSpace.uiSettings.set({
        'timepicker:timeDefaults': '{ "from": "now-7d", "to": "now" }',
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
      await Promise.all([
        apiServices.sampleData.remove('logs', scoutSpace.id),
        apiServices.sampleData.remove('flights', scoutSpace.id),
      ]);
    });

    spaceTest(
      'dashboard add filter from ES|QL panel should not show duplicate data view names',
      async ({ page, pageObjects }) => {
        const { dashboard } = pageObjects;

        await spaceTest.step('create a new dashboard with an ES|QL panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewPanel('ES|QL');

          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
        });

        await spaceTest.step('set the ESQL query and apply', async () => {
          const codeEditor = new KibanaCodeEditorWrapper(page);
          await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
          await codeEditor.setCodeEditorValue(WILDCARD_ESQL_QUERY);

          await page.testSubj.click('ESQLEditor-run-query-button');
          await page.locator('.echCanvasRenderer').waitFor({ state: 'visible', timeout: 30_000 });
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await page.testSubj.click('applyFlyoutButton');
          await expect(page.testSubj.locator('customizeLens')).toBeHidden();
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('add a Lens chart panel using flights data view', async () => {
          await dashboard.openNewLensPanel();
          await expect(page.testSubj.locator('lnsApp')).toBeVisible();

          await page.testSubj.click('lns-dataView-switch-link');
          await page.testSubj.fill('indexPattern-switcher--input', 'Kibana Sample Data Flights');
          await page
            .locator(
              `[data-test-subj="indexPattern-switcher"] [title="Kibana Sample Data Flights"]`
            )
            .click();

          await expect(page.testSubj.locator('fieldListLoading')).toBeHidden({ timeout: 30_000 });
          await page.testSubj.click('fieldToggle-AvgTicketPrice');
          await pageObjects.lens.saveAndReturn();
          await dashboard.waitForRenderComplete();
          await dashboard.expectPanelCount(2);
        });

        await spaceTest.step('click on a chart coordinate to trigger a filter', async () => {
          const panelIds = await page.testSubj
            .locator('dashboardPanel')
            .evaluateAll((panels) => panels.map((p) => p.id));
          const embeddableId = panelIds[0].replace('panel-', '');
          const canvas = page.locator(
            `[data-test-embeddable-id="${embeddableId}"] .echCanvasRenderer`
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
          const dataViewCombo = page.testSubj.locator('filterIndexPatternsSelect');
          await expect(dataViewCombo).toBeVisible({ timeout: 5_000 });

          await dataViewCombo.locator('[data-test-subj="comboBoxInput"]').click();

          const optionsList = page.locator('.euiFilterSelectItem');
          await expect.poll(() => optionsList.count(), { timeout: 5_000 }).toBeGreaterThan(0);

          const allOptionTexts = await optionsList.allInnerTexts();
          const uniqueTexts = [...new Set(allOptionTexts)];
          expect(allOptionTexts).toHaveLength(uniqueTexts.length);
        });
      }
    );

    spaceTest(
      'filter fields should be available after changing ES|QL query source',
      async ({ page, pageObjects }) => {
        const { dashboard } = pageObjects;

        await spaceTest.step('create a new dashboard with an ES|QL panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewPanel('ES|QL');
          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
        });

        await spaceTest.step('set the initial ESQL query and apply', async () => {
          const codeEditor = new KibanaCodeEditorWrapper(page);
          await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
          await codeEditor.setCodeEditorValue(INITIAL_ESQL_QUERY);
          await page.testSubj.click('ESQLEditor-run-query-button');
          await page.locator('.echCanvasRenderer').waitFor({ state: 'visible', timeout: 30_000 });
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await page.testSubj.click('applyFlyoutButton');
          await expect(page.testSubj.locator('customizeLens')).toBeHidden();
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('reopen the inline editor and change the query', async () => {
          const panelIds = await page.testSubj
            .locator('dashboardPanel')
            .evaluateAll((panels) => panels.map((p) => p.id));
          const embeddableId = panelIds[0].replace('panel-', '');

          await dashboard.openInlineEditor(embeddableId);
          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();

          const codeEditor = new KibanaCodeEditorWrapper(page);
          await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
          await codeEditor.setCodeEditorValue(WILDCARD_ESQL_QUERY);
          await page.testSubj.click('ESQLEditor-run-query-button');
          await page.locator('.echCanvasRenderer').waitFor({ state: 'visible', timeout: 30_000 });
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await page.testSubj.click('applyFlyoutButton');
          await expect(page.testSubj.locator('customizeLens')).toBeHidden();
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('open add filter and verify fields are available', async () => {
          await page.testSubj.click('addFilter');
          await expect(page.testSubj.locator('addFilterPopover')).toBeVisible();

          await page.testSubj.click('filterFieldSuggestionList > comboBoxInput');
          const fieldOptions = page.locator('.euiFilterSelectItem');
          await expect.poll(() => fieldOptions.count(), { timeout: 10_000 }).toBeGreaterThan(0);
        });
      }
    );
  }
);
