/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SAMPLE_DATA_SET = 'ecommerce';

test.describe(
  'Discover Alerts menu with alerting v2',
  {
    tag: ['@local-stateful-classic', '@local-serverless-observability_complete'],
  },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.sampleData.install(SAMPLE_DATA_SET);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAlertingV2Editor();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.writeAndSubmitEsqlQuery(
        'FROM kibana_sample_data_ecommerce | LIMIT 10'
      );
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    // Sample data is not removed in afterAll — other suites in the same
    // serverless lane share the ecommerce dataset and removing it here
    // races with their active queries.

    test('should show Alerts menu with the v2 ES|QL rule row and hide v1 entries', async ({
      pageObjects,
    }) => {
      await pageObjects.discoverAppMenu.openAlertsMenu();

      await expect(pageObjects.discoverAppMenu.selectorFlyout).toBeVisible();
      await expect(pageObjects.discoverAppMenu.createEsqlRuleCard).toBeVisible();

      await expect(pageObjects.discoverAppMenu.createAlertButton).toBeHidden();
      await expect(pageObjects.discoverAppMenu.manageAlertsButton).toBeHidden();
    });
  }
);
