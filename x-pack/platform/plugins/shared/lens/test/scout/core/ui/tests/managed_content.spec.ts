/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esArchiverFixture, findImportedSavedObjectId, mergeTests, spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/managed_content';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const test = mergeTests(spaceTest, esArchiverFixture);

test.describe('Lens managed content', { tag: '@local-stateful-classic' }, () => {
  let managedId: string;
  let unmanagedId: string;

  test.beforeAll(async ({ esArchiver, scoutSpace }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    managedId = findImportedSavedObjectId(imported, 'lens', 'Managed lens vis');
    unmanagedId = findImportedSavedObjectId(imported, 'lens', 'Unmanaged lens vis');
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  test('requires a copy when saving a managed visualization', async ({ page, pageObjects }) => {
    const { lens } = pageObjects;
    const badge = page.testSubj.locator('managedContentBadge');
    const saveAsNew = page.testSubj.locator('saveAsNewCheckbox');

    await page.gotoApp('lens', { hash: `/edit/${managedId}`, readyWhen: lens.lensApp });
    await expect(badge).toBeVisible();
    await lens.openSaveOptionsIfNeeded();
    await lens.saveButton.click();
    await expect(lens.saveModal).toBeVisible();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'true');
    await expect(saveAsNew).toBeDisabled();
    await lens.saveModal.getByRole('button', { name: 'Cancel' }).click();

    await page.gotoApp('lens', { hash: `/edit/${unmanagedId}`, readyWhen: lens.lensApp });
    await expect(badge).toBeHidden();
    await lens.openSaveOptionsIfNeeded();
    await lens.saveButton.click();
    await expect(lens.saveModal).toBeVisible();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'false');
    await expect(saveAsNew).toBeEnabled();
  });
});
