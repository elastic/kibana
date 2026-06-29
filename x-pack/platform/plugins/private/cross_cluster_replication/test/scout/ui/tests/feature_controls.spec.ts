/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Runs stateful classic only: CCR is not available on Cloud deployments.

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

test.describe(
  'Cross-Cluster Replication - Feature Controls',
  { tag: tags.stateful.classic },
  () => {
    test('kibana_admin can access Stack Management but not CCR', async ({ browserAuth, page }) => {
      await browserAuth.loginWithBuiltInRole('kibana_admin');
      await page.gotoApp('management');

      await test.step('Stack Management page is visible', async () => {
        const managementHeading = page.testSubj.locator('managementHome');
        await expect(managementHeading).toBeVisible();
      });

      await test.step('CCR link is not visible without manage_ccr privilege', async () => {
        const ccrLink = page.testSubj.locator('cross_cluster_replication');
        await expect(ccrLink).toBeHidden();
      });
    });

    test('ccr_user with dashboard read can access CCR in Stack Management', async ({
      browserAuth,
      page,
    }) => {
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.ccr_dashboard_user_role);
      await page.gotoApp('management');

      await test.step('Stack Management page is visible', async () => {
        const managementHeading = page.testSubj.locator('managementHome');
        await expect(managementHeading).toBeVisible();
      });

      await test.step('CCR link is visible with manage_ccr privilege', async () => {
        const ccrLink = page.testSubj.locator('cross_cluster_replication');
        await expect(ccrLink).toBeVisible();
      });
    });
  }
);
