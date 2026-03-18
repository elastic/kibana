/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';
import {
  convertToEsqlViaModal,
  openDimensionEditorAndWaitForFlyout,
  openInlineEditorAndWaitVisible,
} from '../fixtures/helpers';

spaceTest.describe('Lens Convert to ES|QL', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        'lens.enable_esql_conversion': 'true',
      },
    });

    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.ESQL_CONVERSION_DASHBOARD);
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { dashboard } = pageObjects;

    await dashboard.goto();
    await page.getByTestId(testData.ESQL_CONVERSION_DASHBOARD_TEST_ID).click();
    await dashboard.waitForPanelsToLoad(2);
    await dashboard.switchToEditMode();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should display ES|QL conversion modal for inline visualizations',
    async ({ pageObjects, page }) => {
      const { dashboard, lens } = pageObjects;

      await openInlineEditorAndWaitVisible(pageObjects, testData.INLINE_METRIC_PANEL_ID);
      await convertToEsqlViaModal({ pageObjects, page });

      // Apply conversion changes
      await lens.getApplyFlyoutButton().click();
      // Make sure the editor is closed
      const editor = lens.getInlineEditor();
      await expect(editor).toBeHidden();

      // Open editor again and check the "Apply and close" button is disabled
      await dashboard.openInlineEditor(testData.INLINE_METRIC_PANEL_ID);
      await expect(editor).toBeVisible();
      await expect(lens.getApplyFlyoutButton()).toBeDisabled();

      // TODO: Add conversion assertions: https://github.com/elastic/kibana/issues/250385
    }
  );

  spaceTest(
    'should update and reflect the visualization configuration after the conversion',
    async ({ pageObjects, page }) => {
      const { dashboard, lens } = pageObjects;

      await openInlineEditorAndWaitVisible(pageObjects, testData.INLINE_METRIC_PANEL_ID);
      await convertToEsqlViaModal({ pageObjects, page });

      const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
      await openDimensionEditorAndWaitForFlyout(pageObjects, page, metricDimensionPanel);

      // Update primary metric name
      const nameInput = page.getByTestId('name-input');
      await nameInput.fill('Converted metric');
      await expect(nameInput).toHaveValue('Converted metric');

      // Check that the name has been updated in the panel
      const panel = dashboard.getPanelByEmbeddableId(testData.INLINE_METRIC_PANEL_ID);
      await expect(panel).toContainText('Converted metric');

      // Apply changes by clicking on the "Apply and close" button
      await lens.getSecondaryFlyoutBackButton().click();
      await lens.getApplyFlyoutButton().click();

      // The "Apply and close" button is disabled when there are no unsaved changes
      await openInlineEditorAndWaitVisible(pageObjects, testData.INLINE_METRIC_PANEL_ID);
      await expect(lens.getApplyFlyoutButton()).toBeDisabled();
    }
  );

  spaceTest(
    'should correctly cancel the conversion and close the flyout',
    async ({ pageObjects, page }) => {
      const { lens } = pageObjects;

      await openInlineEditorAndWaitVisible(pageObjects, testData.INLINE_METRIC_PANEL_ID);
      await convertToEsqlViaModal({ pageObjects, page });

      await lens.getCancelFlyoutButton().click();
      await expect(lens.getInlineEditor()).toBeHidden();

      // Reopen and verify revert: form-based mode with Convert button visible
      await openInlineEditorAndWaitVisible(pageObjects, testData.INLINE_METRIC_PANEL_ID);
      await expect(lens.getConvertToEsqlButton()).toBeEnabled();
      await expect(page.getByTestId('ESQLEditor')).toBeHidden();
    }
  );

  spaceTest(
    'should disable Convert to ES|QL button for visualizations saved to library',
    async ({ pageObjects }) => {
      await openInlineEditorAndWaitVisible(pageObjects, testData.SAVED_METRIC_PANEL_ID);
      await expect(pageObjects.lens.getConvertToEsqlButton()).toBeDisabled();
    }
  );
});
