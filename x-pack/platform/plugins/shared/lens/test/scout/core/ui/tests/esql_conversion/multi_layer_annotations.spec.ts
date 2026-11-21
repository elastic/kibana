/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  cancelLensInlineEditorAndWaitClosed,
  openInlineEditorAndWaitVisible,
  test,
  testData,
} from '../../fixtures';

test.describe(
  'Lens Convert to ES|QL multi-layer and annotations',
  { tag: '@local-stateful-classic' },
  () => {
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
      await dashboard.waitForPanelsToLoad(4);
    });

    test.afterAll(async ({ kbnClient, uiSettings, apiServices }) => {
      await uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
      // `setDynamicConfigOverrides` merges by flattened key, so an empty object here is a
      // no-op: the override must be nulled out explicitly to actually remove it.
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'lens.enable_esql_conversion': null,
        },
      });
    });

    test('converts eligible data layers and preserves annotation and reference layers', async ({
      pageObjects,
      page,
    }) => {
      const { dashboard, lens } = pageObjects;

      await openInlineEditorAndWaitVisible(
        pageObjects,
        testData.ESQL_CONVERSION_PANEL_IDS.MULTI_LAYER
      );
      await lens.workspace.convertToEsqlButton.click();

      const modal = lens.workspace.convertToEsqlModal;
      await expect(modal.getByText('Will be converted', { exact: true })).toHaveCount(2);
      await expect(modal.getByText('Will remain unchanged', { exact: true })).toHaveCount(2);
      await expect(modal.getByRole('checkbox')).toHaveCount(0);
      // the fixture's annotation layer only has manual annotations, so nothing is capped by a query limit
      await expect(modal.getByTestId('lnsConvertToEsqlAnnotationLimitWarning')).toBeHidden();
      await lens.workspace.convertToEsqlModalConfirmButton.click();
      await expect(modal).toBeHidden();
      await expect(lens.workspace.convertToEsqlButton).toBeHidden();

      // Conversion recreates the inline editor store with the text-based datasource.
      // Wait for the remounted layer tabs instead of reading during the transient unmount.
      await expect.poll(() => lens.layers.getLayerCount()).toBe(4);
      expect(await lens.workspace.getEsqlQuery()).toContain('STATS COUNT(*)');

      await lens.layers.activateLayerTab(1);
      expect(await lens.workspace.getEsqlQuery()).toContain('STATS MEDIAN(bytes)');

      await lens.layers.activateLayerTab(2);
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsXY_xAnnotationsPanel')
      ).toHaveText('Event');

      await lens.layers.activateLayerTab(3);
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
      expect(
        await lens.dimensions.getDimensionTriggerText('lnsXY_yReferenceLineLeftPanel')
      ).toMatch(/^Static value: /);

      const panel = dashboard.getPanelByEmbeddableId(
        testData.ESQL_CONVERSION_PANEL_IDS.MULTI_LAYER
      );
      await expect(panel.getByRole('button', { name: /Count of records/ })).toBeVisible();
      await expect(panel.getByRole('button', { name: /Median of bytes/ })).toBeVisible();
      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

      await applyLensInlineEditorAndWaitClosed({ lens });
      await openInlineEditorAndWaitVisible(
        pageObjects,
        testData.ESQL_CONVERSION_PANEL_IDS.MULTI_LAYER
      );
      expect(await lens.layers.getLayerCount()).toBe(4);
      expect(await lens.workspace.getEsqlQuery()).toContain('STATS COUNT(*)');
    });

    test('should disable Convert to ES|QL button for query annotations that use global filters', async ({
      pageObjects,
      page,
    }) => {
      const { lens } = pageObjects;

      await openInlineEditorAndWaitVisible(
        pageObjects,
        testData.ESQL_CONVERSION_PANEL_IDS.MULTI_LAYER
      );
      await expect(lens.workspace.convertToEsqlButton).toBeEnabled();

      // The fixture's annotation layer uses global filters, which ES|QL annotations don't apply,
      // so converting its query annotation would change what the chart shows.
      await lens.layers.activateLayerTab(2);
      await lens.dimensions.openDimensionEditor(
        'lnsXY_xAnnotationsPanel > lns-dimensionTrigger',
        2
      );
      await page.testSubj.click('lnsXY_annotation_query');
      await lens.style.configureQueryAnnotation({ queryString: '*', timeField: 'utc_time' });
      await lens.closeDimensionEditor();

      await expect(lens.workspace.convertToEsqlButton).toBeDisabled();

      await cancelLensInlineEditorAndWaitClosed({ lens });
    });

    test('converts query annotations to ES|QL annotations', async ({ pageObjects, page }) => {
      const { dashboard, lens } = pageObjects;
      const annotationQuery = 'machine.os.raw : "osx"';

      await openInlineEditorAndWaitVisible(
        pageObjects,
        testData.ESQL_CONVERSION_PANEL_IDS.MULTI_LAYER
      );

      await test.step('turn the manual annotation into a query annotation', async () => {
        await lens.layers.activateLayerTab(2);
        await lens.layers.setUseGlobalFilters(false);
        await lens.dimensions.openDimensionEditor(
          'lnsXY_xAnnotationsPanel > lns-dimensionTrigger',
          2
        );
        await page.testSubj.click('lnsXY_annotation_query');
        await lens.style.configureQueryAnnotation({
          queryString: annotationQuery,
          // the data view's time field, which the converted annotation keeps as its time column
          timeField: '@timestamp',
        });
        await lens.closeDimensionEditor();
      });

      await test.step('convert the chart including the annotation layer', async () => {
        await lens.workspace.convertToEsqlButton.click();
        const modal = lens.workspace.convertToEsqlModal;
        // two data layers and the annotation layer convert; the static reference line stays
        await expect(modal.getByText('Will be converted', { exact: true })).toHaveCount(3);
        await expect(modal.getByText('Will remain unchanged', { exact: true })).toHaveCount(1);
        await expect(modal.getByTestId('lnsConvertToEsqlAnnotationLimitWarning')).toContainText(
          /1000 most recent events/
        );
        await lens.workspace.convertToEsqlModalConfirmButton.click();
        await expect(modal).toBeHidden();
        await expect.poll(() => lens.layers.getLayerCount()).toBe(4);
      });

      await test.step('assert the annotation became an ES|QL annotation', async () => {
        await lens.layers.activateLayerTab(2);
        await lens.dimensions.openDimensionEditor(
          'lnsXY_xAnnotationsPanel > lns-dimensionTrigger',
          2
        );
        await expect(page.testSubj.locator('lnsXY_annotation_esql')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        await expect(
          page.testSubj.locator('lnsXY-annotation-esql-editor').getByRole('code')
        ).toContainText(/WHERE\s+KQL/);
        await expect(page.testSubj.locator('lnsXY-annotation-esql-timeColumn')).toHaveValue(
          '@timestamp'
        );
        await lens.closeDimensionEditor();

        const panel = dashboard.getPanelByEmbeddableId(
          testData.ESQL_CONVERSION_PANEL_IDS.MULTI_LAYER
        );
        await expect(panel.getByTestId('embeddableError')).toHaveCount(0);
        await expect(panel.getByTestId('xyVisChart')).toBeVisible();
      });

      await cancelLensInlineEditorAndWaitClosed({ lens });
    });
  }
);
