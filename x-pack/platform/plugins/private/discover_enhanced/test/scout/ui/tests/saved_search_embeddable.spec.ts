/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ScoutWorkerFixtures } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
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

test.describe('Discover app - saved search embeddable', { tag: tags.deploymentAgnostic }, () => {
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
    const savedSearchId = randomUUID().replace(/-/g, '');
    const savedSearchTitle = `TempSearch ${savedSearchId}`;
    const dashboardTitle = `Dashboard with deleted saved search ${savedSearchId}`;

    await pageObjects.dashboard.openNewDashboard();
    await createSavedSearch(
      kbnClient,
      savedSearchId,
      savedSearchTitle,
      testData.DATA_VIEW_ID.LOGSTASH
    );
    await pageObjects.dashboard.addPanelFromLibrary(savedSearchTitle);
    await page.testSubj.locator('savedSearchTotalDocuments').waitFor({
      state: 'visible',
    });

    await pageObjects.dashboard.saveDashboard(dashboardTitle);
    await kbnClient.savedObjects.delete({
      type: 'search',
      id: savedSearchId,
    });

    await page.reload();
    await page.testSubj.waitForSelector('dashboardContainer', { timeout: 20000 });
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
