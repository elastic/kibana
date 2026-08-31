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

test.describe('Snapshot & Restore — restore form wizard', { tag: tags.stateful.classic }, () => {
  let repository: ManagedSnapshotRepository | undefined;
  let snapshotName: string | undefined;

  test.afterEach(async ({ esClient, kbnClient }) => {
    if (snapshotName && repository) {
      await esClient.snapshot
        .delete({ snapshot: snapshotName, repository: repository.name })
        .catch(() => {});
      snapshotName = undefined;
    }
    if (repository) {
      await repository.cleanup();
      repository = undefined;
    }
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('restore wizard: renders index settings editor and restore button', async ({
    page,
    browserAuth,
    pageObjects,
    esClient,
    config,
  }) => {
    const { snapshotRestore } = pageObjects;
    const runId = Date.now();
    const currentSnapshotName = `snapshot-${runId}`;
    snapshotName = currentSnapshotName;

    repository = await ensureSnapshotRepository(esClient, config.isCloud, `repo-${runId}`);

    await esClient.snapshot.create({
      repository: repository.name,
      snapshot: currentSnapshotName,
      wait_for_completion: true,
    });

    await browserAuth.loginAsAdmin();
    await page.gotoApp('management/data/snapshot_restore');
    await snapshotRestore.waitForSnapshotsTab({ state: 'hasSnapshots' });

    await test.step('open restore wizard from snapshot row', async () => {
      await snapshotRestore.clickSnapshotRestoreButton(currentSnapshotName);
    });

    await test.step('index settings (wizard step 2): toggle editor on and off', async () => {
      await page.testSubj.click('nextButton');
      await page.testSubj.click('modifyIndexSettingsSwitch');
      await expect(page.testSubj.locator('indexSettingsEditor')).toBeVisible();
      await page.testSubj.click('modifyIndexSettingsSwitch');
    });

    await test.step('review (wizard step 3): restore button is present', async () => {
      await page.testSubj.click('nextButton');
      await expect(page.testSubj.locator('restoreButton')).toBeVisible();
    });
  });
});
