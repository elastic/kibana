/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';

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
    async ({ pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await dashboard.openInlineEditor(testData.INLINE_METRIC_PANEL_ID);

      await lens.getConvertToEsqlButton().click();

      const modal = lens.getConvertToEsqModal();
      await expect(modal).toBeVisible();

      await lens.getConvertToEsqModalConfirmButton().click();

      await expect(modal).toBeHidden();

      await lens.getApplyFlyoutButton().click();

      // TODO: Add conversion assertions: https://github.com/elastic/kibana/issues/250385
    }
  );

  spaceTest(
    'should disable Convert to ES|QL button for visualizations saved to library',
    async ({ pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await dashboard.openInlineEditor(testData.SAVED_METRIC_PANEL_ID);

      await expect(lens.getConvertToEsqlButton()).toBeDisabled();
    }
  );
});
