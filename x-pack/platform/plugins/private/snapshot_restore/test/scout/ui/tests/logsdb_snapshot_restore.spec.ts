/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import {
  type ManagedSnapshotRepository,
  ensureSnapshotRepository,
  waitForSlmSnapshotToFinish,
} from '../fixtures/snapshot_repository_helpers';

// Local only: this journey asserts on a snapshot-free cluster, and ECH's managed
// `found-snapshots` repository continuously accrues SLM snapshots.
test.describe(
  'Snapshot & Restore — logsdb SLM snapshot and restore',
  { tag: ['@local-stateful-classic'] },
  () => {
    const logsDbIndex = 'logsdb-index';
    // Per run, not per file: SLM snapshot names resolve to `<prefix>-{now/d}`, so a prefix reused
    // on the same day collides. Stems must also not be substrings of another spec's prefix.
    let policyId: string | undefined;
    let snapshotPrefix: string | undefined;
    let repository: ManagedSnapshotRepository | undefined;

    test.afterEach(async ({ esClient, kbnClient }) => {
      if (snapshotPrefix) {
        await esClient.snapshot
          .delete({ snapshot: `${snapshotPrefix}-*`, repository: repository?.name ?? '' })
          .catch(() => {});
        snapshotPrefix = undefined;
      }
      if (policyId) {
        await esClient.slm.deleteLifecycle({ policy_id: policyId }).catch(() => {});
        policyId = undefined;
      }
      await esClient.indices.delete({ index: `restored_${logsDbIndex}` }).catch(() => {});
      await esClient.indices.delete({ index: logsDbIndex }).catch(() => {});
      if (repository) {
        await repository.cleanup();
        repository = undefined;
      }
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('create SLM policy, run it, verify logsdb snapshot, and restore with rename', async ({
      page,
      browserAuth,
      pageObjects,
      esClient,
      config,
    }) => {
      // Failure envelope, not a wait: the bounded waits alone can reach 50 s on a slow worker,
      // exceeding the 60 s default once the wizard and restore steps are added.
      test.setTimeout(90_000);

      const { snapshotRestore } = pageObjects;
      const runId = Date.now();
      const currentPolicyId = `testpolicy-${runId}`;
      const currentSnapshotPrefix = `logsdbsnap-${runId}`;
      policyId = currentPolicyId;
      snapshotPrefix = currentSnapshotPrefix;

      repository = await ensureSnapshotRepository(esClient, config.isCloud, `logsdb-repo-${runId}`);
      const repositoryName = repository.name;

      await esClient.indices.delete({ index: logsDbIndex }).catch(() => {});
      await esClient.indices.create({ index: logsDbIndex, settings: { mode: 'logsdb' } });

      await browserAuth.loginAsAdmin();
      await page.gotoApp('management/data/snapshot_restore');
      await snapshotRestore.waitForSnapshotsTab({ state: 'loaded' });

      await test.step('create SLM policy via wizard', async () => {
        await snapshotRestore.navToPolicies();
        await snapshotRestore.fillCreateNewPolicyPageOne(
          currentPolicyId,
          `<${currentSnapshotPrefix}-{now/d}>`,
          repositoryName
        );
        await snapshotRestore.fillCreateNewPolicyPageTwo();
        await snapshotRestore.fillCreateNewPolicyPageThree();
        await snapshotRestore.submitNewPolicy();
        await snapshotRestore.closeFlyout();
      });

      await test.step('verify no snapshots exist yet', async () => {
        await snapshotRestore.navToSnapshots({ empty: true });
      });

      await test.step('run SLM policy via action menu', async () => {
        await snapshotRestore.navToPolicies();
        await snapshotRestore.clickPolicyNameLink(currentPolicyId);
        await snapshotRestore.clickPolicyActionButton();
        await snapshotRestore.clickRunPolicy();
        await snapshotRestore.clickConfirmationModal();
        await snapshotRestore.closeFlyout();
      });

      await test.step('wait for snapshot to complete', async () => {
        await waitForSlmSnapshotToFinish(esClient, repositoryName, currentSnapshotPrefix);
        await snapshotRestore.navToSnapshots({ empty: false });
        await snapshotRestore.waitUntilSnapshotComplete(currentSnapshotPrefix);
      });

      await test.step('verify snapshot is Complete and contains the logsdb index', async () => {
        await snapshotRestore.clickSnapshotLink(currentSnapshotPrefix);
        await expect(page.testSubj.locator('detailTitle')).toContainText(currentSnapshotPrefix);
        await expect(page.testSubj.locator('state')).toContainText('Complete');
        // This policy snapshots every index, well past the 10-index collapse threshold.
        await snapshotRestore.clickShowCollapsedIndices();
        await expect(page.testSubj.locator('indices')).toContainText(logsDbIndex);
        await snapshotRestore.closeSnapshotFlyout();
      });

      await test.step('verify no restore status entries before restoring', async () => {
        await snapshotRestore.navToRestoreStatus({ empty: true });
      });

      await test.step('restore snapshot with index rename', async () => {
        await snapshotRestore.navToSnapshots({ empty: false });
        await snapshotRestore.clickSnapshotLink(currentSnapshotPrefix);
        await snapshotRestore.restoreSnapshot(logsDbIndex, true);
      });

      await test.step('verify restore is Complete in restore status table', async () => {
        await snapshotRestore.navToRestoreStatus({ empty: false });
        const restoredIndexName = `restored_${logsDbIndex}`;
        const restoreRow = page.testSubj
          .locator('restoreList')
          .locator('[data-test-subj="row"]')
          .filter({
            has: page.testSubj.locator('restoreTableIndex').filter({ hasText: restoredIndexName }),
          });
        // Not `toHaveText`: EUI puts a hidden responsive column-header glyph inside each `<td>`,
        // so the cell text is `restored_logsdb-index↦` and exact matching never holds.
        await expect(restoreRow.locator('[data-test-subj="restoreTableIndex"]')).toContainText(
          restoredIndexName
        );
        await expect(restoreRow.locator('[data-test-subj="restoreTableIsComplete"]')).toContainText(
          'Complete'
        );
      });
    });
  }
);
