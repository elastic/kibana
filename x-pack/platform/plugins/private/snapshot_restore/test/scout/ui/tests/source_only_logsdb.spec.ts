/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import { waitForSlmSnapshotToFinish } from '../fixtures/snapshot_repository_helpers';

// Local only: a source-only `fs` repository is an on-prem type, which the plugin hides whenever
// Kibana reports `isCloudEnabled` — genuinely the case on ECH.
test.describe(
  'Snapshot & Restore — source-only logsdb snapshot (partial) and restore rejection',
  { tag: ['@local-stateful-classic'] },
  () => {
    const sourceOnlyLogsDbIndex = 'sourceonly-logsdb-index';
    // Per run, not per file: SLM snapshot names resolve to `<prefix>-{now/d}`, so a prefix reused
    // on the same day collides. Stems must also not be substrings of another spec's prefix.
    let sourceOnlyRepository: string | undefined;
    let policyId: string | undefined;
    let snapshotPrefix: string | undefined;

    test.afterEach(async ({ esClient, kbnClient }) => {
      if (snapshotPrefix && sourceOnlyRepository) {
        await esClient.snapshot
          .delete({ snapshot: `${snapshotPrefix}-*`, repository: sourceOnlyRepository })
          .catch(() => {});
        snapshotPrefix = undefined;
      }
      if (policyId) {
        await esClient.slm.deleteLifecycle({ policy_id: policyId }).catch(() => {});
        policyId = undefined;
      }
      if (sourceOnlyRepository) {
        await esClient.snapshot.deleteRepository({ name: [sourceOnlyRepository] }).catch(() => {});
        sourceOnlyRepository = undefined;
      }
      await esClient.indices.delete({ index: sourceOnlyLogsDbIndex }).catch(() => {});
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('source-only snapshot of logsdb index results in Partial state and cannot be restored', async ({
      page,
      browserAuth,
      pageObjects,
      esClient,
    }) => {
      // Failure envelope, not a wait: the bounded waits alone can reach 50 s on a slow worker,
      // exceeding the 60 s default once the wizard and restore steps are added.
      test.setTimeout(90_000);

      const { snapshotRestore } = pageObjects;
      const runId = Date.now();
      const currentRepository = `srconlyrepo-${runId}`;
      const currentPolicyId = `srconlypolicy-${runId}`;
      const currentSnapshotPrefix = `srconlysnap-${runId}`;
      sourceOnlyRepository = currentRepository;
      policyId = currentPolicyId;
      snapshotPrefix = currentSnapshotPrefix;

      await esClient.indices.delete({ index: sourceOnlyLogsDbIndex }).catch(() => {});
      await esClient.indices.create({
        index: sourceOnlyLogsDbIndex,
        settings: { mode: 'logsdb' },
      });

      // Registered via the API, not the wizard: the default stateful server sets `xpack.cloud.id`,
      // so the UI hides the on-prem `fs` type. `register_repository_wizard.spec.ts` covers the
      // wizard on a server without it. `transport.request` because a source-only repository passes
      // its delegate's `location` through `settings`, which the client's types do not model.
      await esClient.transport.request({
        method: 'PUT',
        path: `/_snapshot/${currentRepository}`,
        querystring: { verify: 'true' },
        body: { type: 'source', settings: { delegate_type: 'fs', location: 'temp' } },
      });

      await browserAuth.loginAsAdmin();
      await page.gotoApp('management/data/snapshot_restore');
      await snapshotRestore.waitForSnapshotsTab({ state: 'loaded' });

      await test.step('create SLM policy for the source-only repository', async () => {
        await snapshotRestore.navToPolicies();
        await snapshotRestore.fillCreateNewPolicyPageOne(
          currentPolicyId,
          `<${currentSnapshotPrefix}-{now/d}>`,
          currentRepository
        );
        await snapshotRestore.fillCreateNewPolicyPageTwo(sourceOnlyLogsDbIndex);
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
        await waitForSlmSnapshotToFinish(esClient, currentRepository, currentSnapshotPrefix);
        await snapshotRestore.navToSnapshots({ empty: false });
        await snapshotRestore.waitUntilSnapshotComplete(currentSnapshotPrefix);
      });

      await test.step('verify snapshot is Partial and contains the logsdb index', async () => {
        await snapshotRestore.clickSnapshotLink(currentSnapshotPrefix);
        await expect(page.testSubj.locator('detailTitle')).toContainText(currentSnapshotPrefix);
        await expect(page.testSubj.locator('state')).toContainText('Partial');
        await expect(page.testSubj.locator('indices')).toContainText(sourceOnlyLogsDbIndex);
        await snapshotRestore.closeSnapshotFlyout();
      });

      await test.step('attempt to restore snapshot — expect error', async () => {
        await snapshotRestore.navToSnapshots({ empty: false });
        await snapshotRestore.clickSnapshotLink(currentSnapshotPrefix);
        await snapshotRestore.restoreSnapshot(sourceOnlyLogsDbIndex, true);
        await expect(page.testSubj.locator('restoreSnapshotError')).toBeVisible();
        await expect(page.testSubj.locator('restoreSnapshotError')).toContainText(
          `index [${sourceOnlyLogsDbIndex}] wasn't fully snapshotted - cannot restore`
        );
      });
    });
  }
);
