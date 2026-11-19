/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

// Local only, and in its own file so it can carry a narrower tag than its `home_page.spec.ts`
// sibling: every ECH deployment ships the managed `found-snapshots` repository, so the empty prompt
// this asserts on never renders there.
test.describe(
  'Snapshot & Restore — home page (no repositories registered)',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.afterEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('app loads with correct title and register repository button', async ({
      page,
      browserAuth,
      pageObjects,
    }) => {
      const { snapshotRestore } = pageObjects;
      await browserAuth.loginAsAdmin();
      await page.gotoApp('management/data/snapshot_restore');
      await snapshotRestore.waitForSnapshotsTab({ state: 'noRepos' });

      const titleText = await snapshotRestore.appTitleText();
      expect(titleText).toBe('Snapshot and Restore');
      await expect(page.testSubj.locator('registerRepositoryButton')).toBeVisible();
    });
  }
);
