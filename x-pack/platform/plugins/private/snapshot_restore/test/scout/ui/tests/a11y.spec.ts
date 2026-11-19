/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import {
  type ManagedSnapshotRepository,
  ensureSnapshotRepository,
} from '../fixtures/snapshot_repository_helpers';

// Modals, flyouts, and context menus render in EUI portals outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

test.describe('Snapshot & Restore — accessibility', { tag: tags.stateful.classic }, () => {
  let repository: ManagedSnapshotRepository | undefined;
  let snapshotName: string | undefined;
  let policyName: string | undefined;

  test.afterEach(async ({ esClient, kbnClient }) => {
    if (snapshotName && repository) {
      await esClient.snapshot
        .delete({ snapshot: snapshotName, repository: repository.name })
        .catch(() => {});
      snapshotName = undefined;
    }
    if (policyName) {
      await esClient.slm.deleteLifecycle({ policy_id: policyName }).catch(() => {});
      policyName = undefined;
    }
    if (repository) {
      // Only removes a locally created `fs` repository; the managed Cloud repository is left intact.
      await repository.cleanup();
      repository = undefined;
    }
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('empty state: all tabs have no a11y violations', async ({
    page,
    browserAuth,
    pageObjects,
    config,
  }) => {
    // On ECH every deployment ships with the managed `found-snapshots` repository, so Snapshot &
    // Restore always has a repository and the empty-state UI (registerRepositoryButton) never
    // renders. The test is skipped on Cloud; it still exercises the empty-state a11y locally where
    // no default repository exists.
    test.skip(
      config.isCloud === true,
      'On ECH the managed `found-snapshots` repository always exists, so the empty-state UI is never rendered.'
    );

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
    config,
  }) => {
    const { snapshotRestore } = pageObjects;
    repository = await ensureSnapshotRepository(esClient, config.isCloud, `testrepo-${Date.now()}`);
    snapshotName = `testsnapshot-${Date.now()}`;

    await esClient.snapshot.create({
      repository: repository.name,
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
  });

  test('create policy wizard: all steps have no a11y violations', async ({
    page,
    browserAuth,
    pageObjects,
    esClient,
    config,
  }) => {
    const { snapshotRestore } = pageObjects;
    repository = await ensureSnapshotRepository(
      esClient,
      config.isCloud,
      `policyrepo-${Date.now()}`
    );
    policyName = `testpolicy-${Date.now()}`;

    await browserAuth.loginAsAdmin();
    await page.gotoApp('management/data/snapshot_restore');
    // The wizard only needs a repository to select; the snapshot count is irrelevant (and non-zero
    // on ECH, where the managed `found-snapshots` repository always holds SLM snapshots).
    await snapshotRestore.waitForSnapshotsTab({ state: 'loaded' });
    await snapshotRestore.navToPolicies();

    await test.step('page one', async () => {
      await snapshotRestore.fillCreateNewPolicyPageOne(
        policyName!,
        '<daily-snap-{now/d}>',
        repository!.name
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
  });
});
