/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';

spaceTest.describe('Lens ES|QL conversion', { tag: ['@ess'] }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.ESQL_CONVERSION_DASHBOARD);
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.goto();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should display ES|QL conversion modal for inline visualizations',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await page.getByTestId(testData.ESQL_CONVERSION_DASHBOARD_TEST_ID).click();
      await dashboard.waitForPanelsToLoad(2);
      await dashboard.switchToEditMode();

      await dashboard.openInlineEditor(testData.INLINE_METRIC_PANEL_ID);

      await lens.getConvertToEsqlButton().click();

      await expect(lens.getConvertToEsqModal()).toBeVisible();

      await lens.getConvertToEsqModalConfirmButton().click();

      await expect(lens.getConvertToEsqModal()).toBeHidden();

      await lens.getApplyFlyoutButton().click();

      // TODO: Add conversion assertions once logic is implemented (https://github.com/elastic/kibana/pull/248078)
    }
  );

  spaceTest(
    'should disable Convert to ES|QL button for visualizations saved to library',
    async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();

      const { dashboard, lens } = pageObjects;

      await dashboard.goto();
      await page.getByTestId(testData.ESQL_CONVERSION_DASHBOARD_TEST_ID).click();
      await dashboard.waitForPanelsToLoad(2);
      await dashboard.switchToEditMode();

      await dashboard.openInlineEditor(testData.SAVED_METRIC_PANEL_ID);

      await expect(lens.getConvertToEsqlButton()).toBeDisabled();
    }
  );
});
