/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

/**
 * Covers the register-repository wizard for a source-only `fs` repository, the setup path the FTR
 * suite drove through the UI. Needs the `snapshot_restore_onprem` config set, which omits
 * `xpack.cloud.id` so the on-prem types are served — hence local only, since that cannot be done on
 * real ECH. The resulting snapshot's behaviour (Partial, restore rejected) is covered by
 * `test/scout/ui/tests/source_only_logsdb.spec.ts`.
 */
test.describe(
  'Snapshot & Restore — register source-only fs repository wizard',
  { tag: ['@local-stateful-classic'] },
  () => {
    let repositoryName: string | undefined;

    test.afterEach(async ({ esClient, kbnClient }) => {
      if (repositoryName) {
        await esClient.snapshot.deleteRepository({ name: [repositoryName] }).catch(() => {});
        repositoryName = undefined;
      }
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('registers a source-only fs repository and lists it', async ({
      page,
      browserAuth,
      pageObjects,
      esClient,
    }) => {
      const { registerRepository } = pageObjects;
      const currentRepositoryName = `srconlywizard-${Date.now()}`;
      repositoryName = currentRepositoryName;

      await browserAuth.loginAsAdmin();
      await page.gotoApp('management/data/snapshot_restore');

      await test.step('walk the wizard with the fs type and source-only enabled', async () => {
        await registerRepository.navToRepositories();
        await registerRepository.createSourceOnlyRepositoryStepOne(currentRepositoryName);
        // `temp` resolves against the cluster's configured `path.repo` entries.
        await registerRepository.createSourceOnlyRepositoryStepTwo('temp');
      });

      await test.step('the new repository appears in the repository list', async () => {
        await expect(registerRepository.repositoryRow(currentRepositoryName)).toBeVisible();
      });

      await test.step('the repository is registered as source-only in Elasticsearch', async () => {
        const repositories = await esClient.snapshot.getRepository({
          name: [currentRepositoryName],
        });
        // Asserting on the cluster proves the form submitted the intended settings, not just that
        // the UI navigated.
        const registered = repositories[currentRepositoryName];
        expect(registered.type).toBe('source');
        expect(registered.settings).toStrictEqual(
          expect.objectContaining({ delegate_type: 'fs', location: 'temp' })
        );
      });
    });
  }
);
