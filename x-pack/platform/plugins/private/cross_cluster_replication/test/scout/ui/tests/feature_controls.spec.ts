/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { CCR_TAGS, KIBANA_ADMIN_ROLE, CCR_USER_ROLE } from '../fixtures/constants';

test.describe('Cross-Cluster Replication - Feature Controls', { tag: CCR_TAGS }, () => {
  test('kibana_admin can access Stack Management but not CCR', async ({ browserAuth, page }) => {
    await browserAuth.loginWithCustomRole(KIBANA_ADMIN_ROLE);
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
    await browserAuth.loginWithCustomRole(CCR_USER_ROLE);
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
});
