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
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_ccr_role);

    await test.step('navigate to the CCR app', async () => {
      await pageObjects.crossClusterReplication.goto();
    });

    await test.step('page title reads "Cross-Cluster Replication"', async () => {
      await expect(pageObjects.crossClusterReplication.appTitle).toHaveText(
        'Cross-Cluster Replication'
      );
    });

    await test.step('both tabs are visible', async () => {
      await expect(pageObjects.crossClusterReplication.followerIndicesTab).toBeVisible();
      await expect(pageObjects.crossClusterReplication.autoFollowPatternsTab).toBeVisible();
    });

    await test.step('follower indices tab shows the create button', async () => {
      await expect(pageObjects.crossClusterReplication.createFollowerIndexButton).toBeVisible();
    });

    await test.step('home page has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('auto-follow patterns tab shows the create button', async () => {
      await pageObjects.crossClusterReplication.openAutoFollowPatternsTab();
      await expect(pageObjects.crossClusterReplication.createAutoFollowPatternButton).toBeVisible();
    });

    await test.step('auto-follow patterns tab has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });

  test('create follower index form has no accessibility violations', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_ccr_role);

    await test.step('navigate to the create follower index form', async () => {
      await pageObjects.crossClusterReplication.gotoCreateFollowerIndex();
    });

    await test.step('create follower index form has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });

  test('create auto-follow pattern form has no accessibility violations', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_ccr_role);

    await test.step('navigate to the create auto-follow pattern form', async () => {
      await pageObjects.crossClusterReplication.gotoCreateAutoFollowPattern();
    });

    await test.step('create auto-follow pattern form has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });

  // NOTE: The "with data" a11y states from the original FTR suite (follower index
  // table + detail flyout, and the auto-follow pattern table + detail flyout) are
  // covered in cross_cluster_replication_with_data.spec.ts, which provisions the
  // required CCR resources via the Elasticsearch client.
});
