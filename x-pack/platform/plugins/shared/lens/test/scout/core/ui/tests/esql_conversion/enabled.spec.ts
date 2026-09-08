/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaCodeEditorWrapper, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { LensPageObjects } from '../../fixtures';
import {
  applyLensInlineEditorAndWaitClosed,
  cancelLensInlineEditorAndWaitClosed,
  convertToEsqlViaModal,
  openDimensionEditorAndWaitForFlyout,
  openInlineEditorAndWaitVisible,
  test,
  testData,
} from '../../fixtures';

/**
 * Asserts the generated ES|QL query for the fixture inline metric
 * (average of bytes + static max 10000 on logstash-*).
 */
async function expectConvertedInlineMetricQuery(page: ScoutPage) {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');

  await expect
    .poll(async () => {
      const query = await codeEditor.getCodeEditorValue();
      return {
        fromLogstash: query.includes('FROM logstash-*'),
        avgBytes: query.includes('AVG(bytes)'),
        staticMax: query.includes('static_max_value = 10000'),
        timeStart: query.includes('?_tstart'),
        timeEnd: query.includes('?_tend'),
      };
    })
    .toStrictEqual({
      fromLogstash: true,
      avgBytes: true,
      staticMax: true,
      timeStart: true,
      timeEnd: true,
    });
}

/**
 * Asserts the inline metric panel still shows Average of bytes with its max progress bar.
 * Scoped to the panel embeddable — the dashboard also has a library metric with the same title.
 */
async function expectConvertedInlineMetricPanel(dashboard: LensPageObjects['dashboard']) {
  const panel = dashboard.getPanelByEmbeddableId(testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC);
  await expect(panel).toContainText('Average of bytes');
  await expect(panel).toContainText('5,727.314');
  await expect(panel.locator('.echSingleMetricProgress')).toBeVisible();
}

test.describe('Lens Convert to ES|QL', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings, apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        'lens.enable_esql_conversion': true,
      },
    });

    await esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVE_PATHS.ESQL_CONVERSION_DASHBOARD);
    await uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { dashboard } = pageObjects;

    await dashboard.openDashboardWithIdInEditMode(testData.ESQL_CONVERSION_DASHBOARD_ID);
    await dashboard.waitForPanelsToLoad(2);
  });

  test.afterAll(async ({ kbnClient, uiSettings, apiServices }) => {
    await uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
    // `setDynamicConfigOverrides` merges by flattened key, so an empty object here is a
    // no-op: the override must be nulled out explicitly to actually remove it.
    await apiServices.core.settings({
      'feature_flags.overrides': { 'lens.enable_esql_conversion': null },
    });
  });

  test('should display ES|QL conversion modal for inline visualizations', async ({
    pageObjects,
    page,
  }) => {
    const { dashboard, lens } = pageObjects;

    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );

    await convertToEsqlViaModal({ pageObjects, page });

    // Conversion produced the expected query and the metric still renders correctly
    await expectConvertedInlineMetricQuery(page);
    await expect(
      lens.dimensions.getDimensionTriggersLocator('lnsMetric_primaryMetricDimensionPanel')
    ).toHaveText('Average of bytes');
    await expectConvertedInlineMetricPanel(dashboard);

    await applyLensInlineEditorAndWaitClosed({ lens });

    // Dashboard panel keeps the converted metric after apply
    await expectConvertedInlineMetricPanel(dashboard);

    // Reopen: still text-based, no unsaved changes, query persisted
    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );
    await expect(page.getByText('ES|QL Query Results')).toBeVisible();
    await expect(lens.applyFlyoutButton).toBeDisabled();
    await expectConvertedInlineMetricQuery(page);
  });

  test('should update and reflect the visualization configuration after the conversion', async ({
    pageObjects,
    page,
  }) => {
    const { dashboard, lens } = pageObjects;

    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );

    await convertToEsqlViaModal({ pageObjects, page });

    // Update primary metric name from the dimension editor
    const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
    await openDimensionEditorAndWaitForFlyout(pageObjects, page, metricDimensionPanel);
    const nameInput = page.getByTestId('name-input');
    await nameInput.fill('Converted metric');
    await expect(nameInput).toHaveValue('Converted metric');

    // Check that the name has been updated in the panel
    const panel = dashboard.getPanelByEmbeddableId(
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );
    await expect(panel).toContainText('Converted metric');

    await lens.workspace.secondaryFlyoutBackButton.click();

    await applyLensInlineEditorAndWaitClosed({ lens });

    // The "Apply and close" button is disabled when there are no unsaved changes
    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );
    await expect(page.getByText('ES|QL Query Results')).toBeVisible();
    await expect(lens.applyFlyoutButton).toBeDisabled();
  });

  test('should correctly cancel the conversion and close the flyout', async ({
    pageObjects,
    page,
  }) => {
    const { lens } = pageObjects;

    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );

    await convertToEsqlViaModal({ pageObjects, page });

    await cancelLensInlineEditorAndWaitClosed({ lens });

    // Reopen and verify revert: form-based mode with Convert button visible
    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );
    await expect(lens.workspace.convertToEsqlButton).toBeEnabled();
    await expect(page.getByTestId('ESQLEditor')).toBeHidden();
  });

  test('should disable Convert to ES|QL button for visualizations saved to library', async ({
    pageObjects,
  }) => {
    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.SAVED_METRIC
    );
    await expect(pageObjects.lens.workspace.convertToEsqlButton).toBeDisabled();
  });
});
