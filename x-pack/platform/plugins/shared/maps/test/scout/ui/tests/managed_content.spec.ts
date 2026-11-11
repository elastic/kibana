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

test.describe('Maps managed content', { tag: '@local-stateful-classic' }, () => {
  let managedId: string;
  let unmanagedId: string;

  test.beforeAll(async ({ esArchiver, scoutSpace }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    managedId = findImportedSavedObjectId(imported, 'map', 'Managed map');
    unmanagedId = findImportedSavedObjectId(imported, 'map', 'Unmanaged map');
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  test('requires a copy when saving a managed map', async ({ page, pageObjects }) => {
    const { maps } = pageObjects;
    const badge = page.testSubj.locator('managedContentBadge');
    const saveAsNew = page.testSubj.locator('saveAsNewCheckbox');

    await maps.openMapWithId(managedId);
    await expect(badge).toBeVisible();
    await maps.clickSaveButton();
    await expect(maps.saveModal.modal).toBeVisible();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'true');
    await expect(saveAsNew).toBeDisabled();
    await maps.saveModal.modal.getByRole('button', { name: 'Cancel' }).click();

    await maps.openMapWithId(unmanagedId);
    await expect(badge).toBeHidden();
    await maps.clickSaveButton();
    await expect(maps.saveModal.modal).toBeVisible();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'false');
    await expect(saveAsNew).toBeEnabled();
  });
});
