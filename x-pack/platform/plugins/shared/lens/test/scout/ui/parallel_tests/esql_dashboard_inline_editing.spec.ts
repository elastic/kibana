/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { applyLensInlineEditorAndWaitClosed, testData } from '../fixtures';

const setEsqlQueryAndRun = async (
  dashboard: PageObjects['dashboard'],
  page: ScoutPage,
  codeEditor: KibanaCodeEditorWrapper,
  query: string
) => {
  await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
  await codeEditor.setCodeEditorValue(query);
  await page.testSubj.click('ESQLEditor-run-query-button');
  await dashboard.waitForRenderComplete();
};

spaceTest.describe('Lens ESQL dashboard inline editing', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { dashboard } = pageObjects;

    await dashboard.openTryEsqlDashboard();
    await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
    await dashboard.waitForRenderComplete();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should keep the table type when the user adds a limit via Try ESQL',
    async ({ pageObjects, page }) => {
      const { dashboard, lens } = pageObjects;
      const codeEditor = new KibanaCodeEditorWrapper(page);

      await spaceTest.step('set ESQL query and validate the chart type is table', async () => {
        await setEsqlQueryAndRun(dashboard, page, codeEditor, 'from logstash-*');
        expect(await lens.getChartSwitchType()).toBe('Table');
      });

      await spaceTest.step('remove all auto-loaded columns and add bytes', async () => {
        await lens.removeAllDimensions('lnsDatatable_metrics');

        await page.testSubj
          .locator('lnsDatatable_metrics')
          .getByTestId('lns-empty-dimension')
          .click();
        await expect(
          page.testSubj.locator('lns-indexPattern-dimensionContainerClose')
        ).toBeVisible();

        const fieldCombo = page.components.comboBox('text-based-dimension-field');
        await fieldCombo.setSelectedOptions(['bytes']);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step(
        'add limit to query and verify table type and bytes column persist',
        async () => {
          await setEsqlQueryAndRun(dashboard, page, codeEditor, 'from logstash-* | limit 100');
          await expect(page.testSubj.locator('lnsChartSwitchPopover')).toHaveText('Table');

          const bytesDimension = page.testSubj
            .locator('lnsDatatable_metrics > lns-dimensionTrigger-textBased')
            .filter({ hasText: /^bytes$/ });
          await expect(bytesDimension).toBeVisible();
        }
      );
    }
  );

  spaceTest(
    'should add a limit without changing the chart type or the color',
    async ({ pageObjects, page }) => {
      const { dashboard, lens } = pageObjects;
      const codeEditor = new KibanaCodeEditorWrapper(page);

      await spaceTest.step('create a line chart panel with a red Y-axis color', async () => {
        await setEsqlQueryAndRun(
          dashboard,
          page,
          codeEditor,
          'from logstash-* | stats maxB = max(bytes) by geo.dest'
        );

        // change to line chart
        await lens.switchToVisualization('line');
        await expect(page.testSubj.locator('lnsChartSwitchPopover')).toHaveText('Line');

        // change the color to red
        await page.testSubj.click('lnsXY_yDimensionPanel');
        const colorPickerInput = page.getByTestId(/indexPattern-dimension-colorPicker/);
        await colorPickerInput.fill('');
        await colorPickerInput.fill('#ff0000');
        await expect(colorPickerInput).toHaveValue('#FF0000');

        await lens.closeDimensionEditor();
        await applyLensInlineEditorAndWaitClosed({ lens });
      });

      await spaceTest.step(
        'add limit and verify line chart type and red color persist',
        async () => {
          await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
          await expect(lens.getInlineEditor()).toBeVisible();

          await setEsqlQueryAndRun(
            dashboard,
            page,
            codeEditor,
            'from logstash-* | stats maxB = max(bytes) by geo.dest | limit 10'
          );

          await expect(page.testSubj.locator('lnsChartSwitchPopover')).toHaveText('Line');

          await page.testSubj.click('lnsXY_yDimensionPanel');
          const colorPickerInput = page.getByTestId(/indexPattern-dimension-colorPicker/);
          await expect(colorPickerInput).toHaveValue('#FF0000');
        }
      );
    }
  );
});
