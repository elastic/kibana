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

test.describe('Snapshot & Restore — home page', { tag: tags.stateful.classic }, () => {
  let repository: ManagedSnapshotRepository | undefined;

  test.afterEach(async ({ kbnClient }) => {
    if (repository) {
      await repository.cleanup();
      repository = undefined;
    }
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('cleanup repository via repository details flyout', async ({
    page,
    browserAuth,
    pageObjects,
    esClient,
    config,
  }) => {
    const { snapshotRestore } = pageObjects;
    repository = await ensureSnapshotRepository(esClient, config.isCloud, `repo-${Date.now()}`);

    await browserAuth.loginAsAdmin();
    await page.gotoApp('management/data/snapshot_restore');
    await snapshotRestore.waitForSnapshotsTab({ state: 'loaded' });
    await snapshotRestore.navToRepositories();
    await snapshotRestore.viewRepositoryDetails(repository.name);

    const cleanupResponse = await snapshotRestore.performRepositoryCleanup();
    expect(cleanupResponse).toContain('results');
    expect(cleanupResponse).toContain('deleted_bytes');
    expect(cleanupResponse).toContain('deleted_blobs');
  });
});
