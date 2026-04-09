/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

const SAMPLE_DATA_SET = 'ecommerce';

// Failing: See https://github.com/elastic/kibana/issues/261380
test.describe.skip(
  'Discover Alerts menu with alerting v2',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.search,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.sampleData.install(SAMPLE_DATA_SET);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto();
      await pageObjects.discover.writeAndSubmitEsqlQuery(
        'FROM kibana_sample_data_ecommerce | LIMIT 10'
      );
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.sampleData.remove(SAMPLE_DATA_SET);
    });

    test('should show Alerts menu with v2 ES|QL rule row and New badge', async ({
      pageObjects,
    }) => {
      await test.step('open the alerts menu', async () => {
        await pageObjects.discoverAppMenu.openAlertsMenu();
      });

      await test.step('verify no top-level Rules button exists', async () => {
        await expect(pageObjects.discoverAppMenu.getRulesTopLevelButton()).not.toBeVisible();
      });

      await test.step('verify v2 ES|QL rule row is visible with New badge', async () => {
        await expect(pageObjects.discoverAppMenu.getV2RuleButton()).toBeVisible();
        await expect(pageObjects.discoverAppMenu.getV2RuleBadge()).toBeVisible();
        await expect(pageObjects.discoverAppMenu.getV2RuleBadge()).toHaveText('New');
      });

      await test.step('verify legacy rows are still present', async () => {
        await expect(pageObjects.discoverAppMenu.getCreateAlertButton()).toBeVisible();
        await expect(pageObjects.discoverAppMenu.getManageAlertsButton()).toBeVisible();
      });
    });
  }
);
