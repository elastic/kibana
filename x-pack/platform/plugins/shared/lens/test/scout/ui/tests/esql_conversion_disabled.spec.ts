/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { openDashboardInEditMode, openInlineEditorAndWaitVisible, testData } from '../fixtures';

test.describe('Lens Convert to ES|QL button', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVE_PATHS.ESQL_CONVERSION_DASHBOARD);
    await uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
    });
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should not display button for inline visualizations when feature flag is set to false', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { lens } = pageObjects;

    await openDashboardInEditMode(
      pageObjects,
      page,
      testData.DATA_TEST_SUBJECTS.ESQL_CONVERSION_DASHBOARD_TITLE_LINK,
      2
    );

    await openInlineEditorAndWaitVisible(
      pageObjects,
      testData.ESQL_CONVERSION_PANEL_IDS.INLINE_METRIC
    );

    await expect(lens.getConvertToEsqlButton()).toBeHidden();
  });
});
