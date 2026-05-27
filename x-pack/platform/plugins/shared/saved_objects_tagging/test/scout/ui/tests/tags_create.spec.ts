/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

test.describe('Tags management create', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ kbnClient, browserAuth, page, kbnUrl, pageObjects }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);

    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.app('management/kibana/tags'));
    await pageObjects.tagManagement.tagsTable.waitForLoaded();
  });

  test.afterEach(async ({ pageObjects }) => {
    await pageObjects.tagManagement.tagModal.closeIfOpen();
  });

  test('creates a valid tag', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;

    await tagManagement.tagModal.openCreate();
    await tagManagement.tagModal.fillForm({
      name: 'my-new-tag',
      description: 'I just added this tag',
      color: '#FF00CC',
    });
    await tagManagement.submitTagModal();

    const tagsInfo = await tagManagement.tagsTable.getDisplayedTagsInfo();
    const newTag = tagsInfo.find((tagInfo) => tagInfo.name === 'my-new-tag');

    expect(newTag).toBeDefined();
    expect(newTag?.description).toBe('I just added this tag');
  });

  test('shows errors when validation fails', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal } = tagManagement;

    await tagModal.openCreate();
    await tagModal.fillForm({
      name: 'a',
      description: 'The name will fail validation',
      color: '#FF00CC',
    });
    await tagManagement.submitTagModal({ waitForClose: false });

    expect(await tagModal.isOpen()).toBe(true);
    expect(await tagModal.hasError()).toBe(true);

    const errors = await tagModal.getValidationErrors();
    expect(errors.name).toBeDefined();
    expect(errors.color).toBeUndefined();
  });

  test('creates a tag after fixing validation errors', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal, tagsTable } = tagManagement;

    await tagModal.openCreate();
    await tagModal.fillForm({
      name: 'a',
      description: 'The name will fail validation',
      color: '#FF00CC',
    });
    await tagManagement.submitTagModal({ waitForClose: false });

    expect(await tagModal.hasError()).toBe(true);

    await tagModal.fillForm({ name: 'valid name' });
    await tagManagement.submitTagModal();

    const tagsInfo = await tagsTable.getDisplayedTagsInfo();
    const newTag = tagsInfo.find((tagInfo) => tagInfo.name === 'valid name');

    expect(newTag).toBeDefined();
  });

  test('closes the modal without creating a tag', async ({ pageObjects }) => {
    const { tagModal, tagsTable } = pageObjects.tagManagement;

    await tagModal.openCreate();
    await tagModal.fillForm({
      name: 'canceled-tag',
      description: 'I will not add this tag',
      color: '#FF00CC',
    });
    await tagModal.cancel();

    const tagsInfo = await tagsTable.getDisplayedTagsInfo();
    const canceledTag = tagsInfo.find((tagInfo) => tagInfo.name === 'canceled-tag');

    expect(canceledTag).toBeUndefined();
  });
});
