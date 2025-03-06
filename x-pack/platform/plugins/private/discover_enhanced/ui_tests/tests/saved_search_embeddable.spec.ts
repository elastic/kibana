/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutWorkerFixtures, expect, tags } from '@kbn/scout';
import { test, testData } from '../fixtures';

const createSavedSearch = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  searchId: string,
  searchTitle: string,
  dataViewId: string
) =>
  await kbnClient.savedObjects.create({
    type: 'search',
    id: searchId,
    overwrite: false,
    attributes: {
      title: searchTitle,
      description: '',
      columns: ['agent', 'bytes', 'clientip'],
      sort: [['@timestamp', 'desc']],
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"highlightAll":true,"version":true,"query":{"language":"lucene","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: dataViewId,
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  });

test.describe('Discover app - saved search embeddable', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  const SAVED_SEARCH_TITLE = 'TempSearch';
  const SAVED_SEARCH_ID = '90943e30-9a47-11e8-b64d-95841ca0b247';

  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
    await uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH, // TODO: investigate why it is required for `node scripts/playwright_test.js` run
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.goto();
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should allow removing the dashboard panel after the underlying saved search has been deleted', async ({
    kbnClient,
    page,
    pageObjects,
  }) => {
    await pageObjects.dashboard.openNewDashboard();
    await createSavedSearch(
      kbnClient,
      SAVED_SEARCH_ID,
      SAVED_SEARCH_TITLE,
      testData.DATA_VIEW_ID.LOGSTASH
    );
    await pageObjects.dashboard.addPanelFromLibrary(SAVED_SEARCH_TITLE);
    await page.testSubj.locator('savedSearchTotalDocuments').waitFor({
      state: 'visible',
    });

    await pageObjects.dashboard.saveDashboard('Dashboard with deleted saved search');
    await kbnClient.savedObjects.delete({
      type: 'search',
      id: SAVED_SEARCH_ID,
    });

    await page.reload();
    await page.waitForLoadingIndicatorHidden();
    await expect(
      page.testSubj.locator('embeddableError'),
      'Embeddable error should be displayed'
    ).toBeVisible();

    await pageObjects.dashboard.removePanel('embeddableError');
    await expect(
      page.testSubj.locator('embeddableError'),
      'Embeddable error should not be displayed'
    ).toBeHidden();
  });
});
