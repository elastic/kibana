/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';

// Modals, flyouts, and context menus render in EUI portals outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

test.describe('Snapshot & Restore — accessibility', { tag: tags.stateful.classic }, () => {
  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('empty state: all tabs have no a11y violations', async ({
    page,
    browserAuth,
    pageObjects,
  }) => {
    const { snapshotRestore } = pageObjects;

    await browserAuth.loginAsAdmin();
    await page.gotoApp('management/data/snapshot_restore');
    await snapshotRestore.waitForSnapshotsTab();

    await test.step('snapshots tab (empty)', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('repositories tab (empty)', async () => {
      await snapshotRestore.navToRepositories();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('policies tab (empty)', async () => {
      await snapshotRestore.navToPolicies();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('restore status tab (empty)', async () => {
      await snapshotRestore.navToRestoreStatus();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });
  });

  test('table views with data: snapshots and repositories have no a11y violations', async ({
    page,
    browserAuth,
    pageObjects,
    esClient,
  }) => {
    const { snapshotRestore } = pageObjects;
    const repoName = `testrepo-${Date.now()}`;
    const snapshotName = `testsnapshot-${Date.now()}`;

    try {
      await esClient.snapshot.createRepository({
        name: repoName,
        verify: true,
        repository: { type: 'fs', settings: { location: 'temp' } },
      });
      await esClient.snapshot.create({
        repository: repoName,
        snapshot: snapshotName,
        wait_for_completion: true,
      });
      await browserAuth.loginAsAdmin();
      await page.gotoApp('management/data/snapshot_restore');
      await snapshotRestore.waitForSnapshotsTab({ state: 'hasSnapshots' });

      await test.step('snapshots table with data', async () => {
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('repositories table with data', async () => {
        await snapshotRestore.navToRepositories();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });
    } finally {
      await esClient.snapshot
        .delete({ snapshot: snapshotName, repository: repoName })
        .catch(() => {});
      await esClient.snapshot.deleteRepository({ name: [repoName] }).catch(() => {});
    }
  });

  test('create policy wizard: all steps have no a11y violations', async ({
    page,
    browserAuth,
    pageObjects,
    esClient,
  }) => {
    const { snapshotRestore } = pageObjects;
    const repoName = `policyrepo-${Date.now()}`;
    const policyName = `testpolicy-${Date.now()}`;

    try {
      await esClient.snapshot.createRepository({
        name: repoName,
        verify: true,
        repository: { type: 'fs', settings: { location: 'temp' } },
      });

      await browserAuth.loginAsAdmin();
      await page.gotoApp('management/data/snapshot_restore');
      await snapshotRestore.waitForSnapshotsTab({ state: 'noSnapshots' });
      await snapshotRestore.navToPolicies();

      await test.step('page one', async () => {
        await snapshotRestore.fillCreateNewPolicyPageOne(
          policyName,
          '<daily-snap-{now/d}>',
          repoName
        );
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('page two', async () => {
        await snapshotRestore.fillCreateNewPolicyPageTwo();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('page three', async () => {
        await snapshotRestore.fillCreateNewPolicyPageThree();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('submit and view flyout', async () => {
        await snapshotRestore.submitNewPolicy();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('policy table with data', async () => {
        await snapshotRestore.closeFlyout();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });
    } finally {
      await esClient.snapshot.deleteRepository({ name: [repoName] }).catch(() => {});
      await esClient.slm.deleteLifecycle({ policy_id: policyName }).catch(() => {});
    }
  });
});
