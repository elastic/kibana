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
test.describe.skip(
  'Upgrade Assistant feature controls',
  { tag: testData.UPGRADE_ASSISTANT_TAGS },
  () => {
    test('shows the Stack Management nav link for a Kibana admin user', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsKibanaAdmin();
      await pageObjects.upgradeAssistant.gotoHome();

      await expect(pageObjects.upgradeAssistant.stackManagementNavLink).toBeVisible();
    });

    test('does not render the Stack section for a Kibana admin user', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsKibanaAdmin();
      await pageObjects.upgradeAssistant.gotoManagement();

      await expect(pageObjects.upgradeAssistant.dataSectionHeading).toBeVisible();
      await expect(pageObjects.upgradeAssistant.insightsAndAlertingSectionHeading).toBeVisible();
      await expect(pageObjects.upgradeAssistant.kibanaSectionHeading).toBeVisible();
      await expect(pageObjects.upgradeAssistant.dataQualityLink).toBeVisible();
      await expect(pageObjects.upgradeAssistant.contentConnectorsLink).toBeVisible();
      await expect(pageObjects.upgradeAssistant.stackSectionHeading).toHaveCount(0);
    });

    test('shows the Stack Management nav link for a dashboard read user with Upgrade Assistant privileges', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsGlobalDashboardReadWithUpgradeAssistant();
      await pageObjects.upgradeAssistant.gotoHome();

      await expect(pageObjects.upgradeAssistant.stackManagementNavLink).toBeVisible();
    });

    test('renders the Stack section with Upgrade Assistant for a dashboard read user with Upgrade Assistant privileges', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsGlobalDashboardReadWithUpgradeAssistant();
      await pageObjects.upgradeAssistant.gotoManagement();

      await expect(pageObjects.upgradeAssistant.stackSectionHeading).toBeVisible();
      await expect(pageObjects.upgradeAssistant.licenseManagementLink).toBeVisible();
      await expect(pageObjects.upgradeAssistant.upgradeAssistantLink).toBeVisible();
    });
  }
);
