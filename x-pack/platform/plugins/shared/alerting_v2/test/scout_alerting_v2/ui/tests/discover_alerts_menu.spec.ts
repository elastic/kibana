/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { READ_ROLE, test } from '../fixtures';

const SAMPLE_DATA_SET = 'ecommerce';

test.describe(
  'Discover Alerts menu with alerting v2',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.sampleData.install(SAMPLE_DATA_SET);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      // The role only grants alerting_v2 privileges (no v1). Each entry inside
      // the Alerts popover is gated independently by its own capability, so
      // this user should see only the v2 ES|QL rule entry — the v1 entries
      // ("Manage rules and connectors", "Create search threshold rule") must
      // remain hidden.
      await browserAuth.loginWithCustomRole(READ_ROLE);
      await pageObjects.discover.goto();
      await pageObjects.discover.writeAndSubmitEsqlQuery(
        'FROM kibana_sample_data_ecommerce | LIMIT 10'
      );
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.sampleData.remove(SAMPLE_DATA_SET);
    });

    test('should show Alerts menu with the v2 ES|QL rule row and hide v1 entries', async ({
      pageObjects,
    }) => {
      await pageObjects.discoverAppMenu.openAlertsMenu();

      await expect(pageObjects.discoverAppMenu.rulesTopLevelButton).toBeHidden();

      await expect(pageObjects.discoverAppMenu.createEsqlRuleButton).toBeVisible();
      await expect(pageObjects.discoverAppMenu.createEsqlRuleBadge).toBeVisible();
      await expect(pageObjects.discoverAppMenu.createEsqlRuleBadge).toHaveText('New');

      await expect(pageObjects.discoverAppMenu.createAlertButton).toBeHidden();
      await expect(pageObjects.discoverAppMenu.manageAlertsButton).toBeHidden();
    });
  }
);
