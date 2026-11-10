/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/managed_content';

spaceTest.describe('Maps managed content', { tag: '@local-stateful-classic' }, () => {
  let managedId: string;
  let unmanagedId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    const getId = (title: string) => {
      const object = imported.find((item) => item.title === title);
      if (!object) throw new Error(`Missing imported saved object: ${title}`);
      return object.id;
    };
    managedId = getId('Managed map');
    unmanagedId = getId('Unmanaged map');
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('requires a copy when saving a managed map', async ({ page, pageObjects }) => {
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
