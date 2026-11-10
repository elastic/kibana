/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/managed_content';

spaceTest.describe('Lens managed content', { tag: '@local-stateful-classic' }, () => {
  let managedId: string;
  let unmanagedId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    const getId = (title: string) => {
      const object = imported.find((item) => item.title === title);
      if (!object) throw new Error(`Missing imported saved object: ${title}`);
      return object.id;
    };
    managedId = getId('Managed lens vis');
    unmanagedId = getId('Unmanaged lens vis');
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'requires a copy when saving a managed visualization',
    async ({ page, pageObjects }) => {
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
    }
  );
});
