/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { createDataStream, deleteDataStream } from '../../lib/data_streams';

const TEST_DS_NAME = 'test-ds-1';

// Serverless Security only: `enableProjectLevelRetentionChecks` is off in `config/serverless.yml`.
test.describe(
  'Data streams project level retention',
  { tag: tags.serverless.security.complete },
  () => {
    test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
      await deleteDataStream(esClient, TEST_DS_NAME);
      await createDataStream(esClient, TEST_DS_NAME);
      await browserAuth.loginAsIndexManagementUser();
      await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
    });

    test.afterEach(async ({ esClient }) => {
      await deleteDataStream(esClient, TEST_DS_NAME);
    });

    test('shows project data retention in the data streams list', async ({ page }) => {
      // The dismissed state lives in local storage, so clear it before the list mounts.
      await page.evaluate(() => window.localStorage.setItem('showProjectLevelRetention', 'true'));
      await page.reload();

      await expect(page.testSubj.locator('projectLevelRetentionLink')).toBeVisible();
      await expect(page.testSubj.locator('projectLevelRetentionCallout')).toBeVisible();
      await expect(page.testSubj.locator('cloudLinkButton')).toBeVisible();
    });
  }
);
