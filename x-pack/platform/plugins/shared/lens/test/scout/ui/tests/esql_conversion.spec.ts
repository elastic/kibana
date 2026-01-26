/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

export const ES_ARCHIVES = {
  LOGSTASH: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
};

export const KBN_ARCHIVES = {
  ESQL_CONVERSION_DASHBOARD:
    'x-pack/platform/plugins/shared/lens/test/scout/ui/fixtures/esql-conversion-dashboard.json',
};

export const DATA_VIEW_ID = {
  LOGSTASH: 'logstash-*',
};

export const LOGSTASH_IN_RANGE_DATES = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

const EDIT_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-editPanel';

test.describe('Lens ES|QL', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/logstash_functional');
    await kbnClient.importExport.load(
      'x-pack/platform/plugins/shared/lens/test/scout/ui/fixtures/esql_conversion_dashboard.json'
    );
    await uiSettings.set({
      defaultIndex: 'logstash-*',
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "Sep 19, 2015 @ 06:31:44.000", "to": "Sep 23, 2015 @ 18:31:44.000"}`,
    });
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should show switch to query mode button', async ({ browserAuth, page }) => {
    await browserAuth.loginAsPrivilegedUser();
    await page.gotoApp('dashboards');
    await page.getByTestId('dashboardListingTitleLink-ES|QL-Conversion-Dashboard').click();
    await expect(page.getByText('Average of bytes')).toBeVisible();
    // dashboard.switchToEditMode()
    await page.getByTestId('dashboardEditMode').click();

    page.getByText('Average of bytes').hover();
    page.getByTestId('embeddablePanelAction-editPanel').click();

    await expect(page.getByRole('button', { name: 'Convert to ES|QL' })).toBeEnabled();
  });
});
