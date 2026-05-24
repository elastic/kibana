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

test.describe('Cross-Cluster Replication', { tag: tags.stateful.classic }, () => {
  test('shows both tabs and their primary action buttons for a user with CCR privileges', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_ccr_role);

    await test.step('navigate to the CCR app', async () => {
      await page.gotoApp('management/data/cross_cluster_replication/follower_indices');
      // Wait for the follower indices list to finish loading before asserting page content.
      await page.testSubj.locator('emptyPrompt').waitFor({ state: 'visible', timeout: 30000 });
    });

    await test.step('page title reads "Cross-Cluster Replication"', async () => {
      await expect(page.testSubj.locator('appTitle')).toHaveText('Cross-Cluster Replication');
    });

    await test.step('both tabs are visible', async () => {
      await expect(page.testSubj.locator('followerIndicesTab')).toBeVisible();
      await expect(page.testSubj.locator('autoFollowPatternsTab')).toBeVisible();
    });

    await test.step('follower indices tab shows the create button', async () => {
      await expect(page.testSubj.locator('createFollowerIndexButton')).toBeVisible();
    });

    await test.step('auto-follow patterns tab shows the create button', async () => {
      await page.testSubj.locator('autoFollowPatternsTab').click();
      await expect(page.testSubj.locator('createAutoFollowPatternButton')).toBeVisible();
    });
  });
});
