/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const ES_ARCHIVES = {
  LOGSTASH: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
};

const DATA_VIEW_ID = {
  LOGSTASH: 'logstash-*',
};

const LOGSTASH_IN_RANGE_DATES = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

const KBN_ARCHIVES = {
  ESQL_CONVERSION_DASHBOARD:
    'x-pack/platform/plugins/shared/lens/test/scout/ui/fixtures/esql_conversion_dashboard.json',
};
const ESQL_CONVERSION_DASHBOARD_TEST_ID = 'dashboardListingTitleLink-ES|QL-Conversion-Dashboard';
const METRIC_VISUALIZATION_ID = 'fb4626b8-d8ce-42d3-913a-081af94cfb51';

test.describe('Lens ES|QL', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings, apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        'lens.enable_esql_conversion': 'true',
      },
    });
    await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(KBN_ARCHIVES.ESQL_CONVERSION_DASHBOARD);
    await uiSettings.set({
      defaultIndex: DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "${LOGSTASH_IN_RANGE_DATES.from}", "to": "${LOGSTASH_IN_RANGE_DATES.to}"}`,
    });
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should display ES|QL conversion modal', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { dashboard, lens } = pageObjects;

    // Navigate to the test dashboard
    await dashboard.goto();
    await page.getByTestId(ESQL_CONVERSION_DASHBOARD_TEST_ID).click();

    // Verify dashboard loaded with the test visualization
    await dashboard.waitForPanelsToLoad(1);

    // Enter edit mode to access visualization actions
    await dashboard.switchToEditMode();

    await dashboard.openInlineEditor(METRIC_VISUALIZATION_ID);

    await lens.getConvertToEsqlButton().click();

    await expect(lens.getConvertToEsqModal()).toBeVisible();

    await lens.getConvertToEsqModalConfirmButton().click();

    await expect(lens.getConvertToEsqModal()).toBeHidden();

    // TODO: Add conversion assertions once logic is implemented (https://github.com/elastic/kibana/pull/248078)
    // For now, this test only verifies the UI flow up to modal interaction
  });
});
