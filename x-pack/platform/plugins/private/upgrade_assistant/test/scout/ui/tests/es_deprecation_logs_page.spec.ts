/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

// All Upgrade Assistant UI tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
// Skipped by https://github.com/elastic/kibana/pull/242259.
test.describe.skip(
  'Upgrade Assistant ES deprecation logs flyout',
  { tag: testData.UPGRADE_ASSISTANT_TAGS },
  () => {
    test.beforeAll(async ({ esClient }) => {
      // Accessing system indices generates deprecation log data for the flyout.
      await esClient.indices.get({ index: '.kibana' });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsSuperuser();
      await pageObjects.upgradeAssistant.gotoOverview();
      await pageObjects.upgradeAssistant.clickVerifyLoggingButton();
    });

    test('shows a warnings callout when there are deprecations', async ({ pageObjects }) => {
      await expect(pageObjects.upgradeAssistant.hasWarningsCallout).toBeVisible();
    });

    test('shows a no warnings callout after resetting the checkpoint', async ({ pageObjects }) => {
      await pageObjects.upgradeAssistant.clickResetLastCheckpointButton();
      await expect(pageObjects.upgradeAssistant.noWarningsCallout).toBeVisible();
    });
  }
);
