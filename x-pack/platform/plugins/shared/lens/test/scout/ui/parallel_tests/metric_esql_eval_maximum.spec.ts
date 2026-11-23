/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, KibanaCodeEditorWrapper, EuiComboBoxWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';
import { recordMetricRenderErrors } from '../fixtures/metric_render_errors';

const TRENDLINE_TIMEOUT_MS = 30_000;

spaceTest.describe('Lens ES|QL metric EVAL maximum', { tag: tags.stateful.classic }, () => {
  let storedDataViewId: string | undefined;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    const { data: dataView } = await apiServices.dataViews.create({
      title: testData.DATA_VIEW_ID.LOGSTASH,
      name: 'scout-metric-esql-eval-maximum',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    storedDataViewId = dataView.id;
    await scoutSpace.uiSettings.set({
      defaultIndex: dataView.id,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify(testData.LOGSTASH_IN_RANGE_DATES),
    });
  });

  spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
    if (storedDataViewId) {
      await apiServices.dataViews.delete(storedDataViewId, scoutSpace.id);
    }
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'renders an EVAL maximum as a bar and can switch to a trendline',
    async ({ browserAuth, page, pageObjects }, testInfo) => {
      const { dashboard, lens } = pageObjects;
      const metricRoot = page.getByTestId('mtrVis');
      const metricProgressBar = metricRoot.getByRole('meter');
      const dimensionTriggers = (panel: string) =>
        page.testSubj.locator(`${panel} > lns-dimensionTrigger-textBased`);
      const maximumPanel = 'lnsMetric_maxDimensionPanel';
      const primaryPanel = 'lnsMetric_primaryMetricDimensionPanel';

      await spaceTest.step('apply a metric suggestion to a query with an EVAL column', async () => {
        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openNewDashboard();
        await dashboard.addNewESQLPanel();
        const codeEditor = new KibanaCodeEditorWrapper(page);
        await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
        // Normalize the fixture's nonzero average to a deterministic value below the maximum.
        await codeEditor.setCodeEditorValue(
          'FROM logstash-* | STATS usage = AVG(bytes) / AVG(bytes) / 2 | EVAL max = 1'
        );
        await page.getByTestId('ESQLEditor-run-query-button').click();
        await dashboard.applyAndCloseESQLPanel();
        await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await lens.switchToVisualization('lnsMetric', { search: 'Metric' });

        await expect(dimensionTriggers(primaryPanel)).toHaveText('usage');
        await expect(dimensionTriggers(maximumPanel)).toHaveCount(0);
        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect
          .poll(() => lens.getMetricVisualizationData())
          .toStrictEqual([expect.objectContaining({ value: '0.5', showingBar: false })]);
      });

      const renderErrors = await recordMetricRenderErrors(page);
      try {
        await spaceTest.step(
          'assign the EVAL column as Maximum value and verify the bar',
          async () => {
            await lens.openDimensionEditor(`${maximumPanel} > lns-empty-dimension`);
            await new EuiComboBoxWrapper(page, 'text-based-dimension-field').selectSingleOption(
              'max'
            );
            await lens.closeDimensionEditor();

            await expect(dimensionTriggers(maximumPanel)).toHaveText(/^max(?: \[\d+\])?$/);
            await expect(metricProgressBar).toBeVisible();
            await expect(metricProgressBar).toHaveAttribute('aria-valuenow', '50');
            await expect(metricProgressBar).toHaveAttribute('aria-valuemax', '100');
            await expect
              .poll(() => lens.getMetricVisualizationData())
              .toStrictEqual([expect.objectContaining({ value: '0.5', showingBar: true })]);
            expect(
              await renderErrors.getErrors(),
              'No transient invalid-column error during maximum assignment'
            ).toStrictEqual([]);
          }
        );

        await spaceTest.step(
          'switch to Line background with the EVAL maximum assigned',
          async () => {
            await lens.openDimensionEditor(`${primaryPanel} > lns-dimensionTrigger-textBased`);
            const lineButton = page.getByTestId('lnsMetric_background_chart_line');
            await lineButton.click();
            await expect(lineButton).toHaveAttribute('aria-pressed', 'true');
            await lens.closeDimensionEditor();

            await expect(metricRoot.locator('.echSingleMetricSparkline')).toBeVisible({
              timeout: TRENDLINE_TIMEOUT_MS,
            });
            await expect(metricProgressBar).toHaveCount(0);
            await expect
              .poll(() => lens.getMetricVisualizationData())
              .toStrictEqual([expect.objectContaining({ value: '0.5', showingTrendline: true })]);
            expect(
              await renderErrors.getErrors(),
              'No transient invalid-column error during trendline activation'
            ).toStrictEqual([]);
          }
        );
      } finally {
        try {
          await testInfo.attach('metric-render-diagnostics', {
            body: JSON.stringify(
              {
                errors: await renderErrors.getErrors(),
                primaryLabels: await dimensionTriggers(primaryPanel).allTextContents(),
                maximumLabels: await dimensionTriggers(maximumPanel).allTextContents(),
              },
              null,
              2
            ),
            contentType: 'application/json',
          });
        } finally {
          await renderErrors.dispose();
        }
      }
    }
  );
});
