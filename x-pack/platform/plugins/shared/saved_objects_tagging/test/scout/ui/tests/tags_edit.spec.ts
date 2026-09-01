/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

test.describe('Tags management edit', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ browserAuth, pageObjects, kbnClient }) => {
    await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.tagManagement.goto();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('displays tag attributes in the edit form', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    await tagManagement.editTag('tag-1');

    expect(await tagManagement.tagModal.getFormValues()).toStrictEqual({
      name: 'tag-1',
      description: 'My first tag!',
      color: '#FF00FF',
    });
  });

  test('edits a tag', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal, tagsTable } = tagManagement;

    await tagManagement.editTag('tag-1');
    await tagModal.fillForm({
      name: 'tag-1-edited',
      description: 'This was edited',
      color: '#FFCC00',
    });
    await tagManagement.submitTagModal();

    const tagsInfo = await tagsTable.getDisplayedTagsInfo();
    const oldTag = tagsInfo.find((tagInfo) => tagInfo.name === 'tag-1');
    const newTag = tagsInfo.find((tagInfo) => tagInfo.name === 'tag-1-edited');

    expect(tagsInfo).toHaveLength(5);
    expect(oldTag).toBeUndefined();
    expect(newTag).toBeDefined();
    expect(newTag?.description).toBe('This was edited');
  });

  test('shows errors when edit validation fails', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal } = tagManagement;

    await tagManagement.editTag('tag-2');
    await tagModal.fillForm({ name: 'a' });
    await tagManagement.submitTagModal({ waitForClose: false });

    expect(await tagModal.isOpen()).toBe(true);
    expect(await tagModal.hasError()).toBe(true);

    const errors = await tagModal.getValidationErrors();
    expect(errors.name).toBeDefined();
    expect(errors.color).toBeUndefined();
  });

  test('edits a tag after fixing validation errors', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal, tagsTable } = tagManagement;

    await tagManagement.editTag('tag-2');
    await tagModal.fillForm({
      name: 'a',
      description: 'edited description',
      color: '#FF00CC',
    });
    await tagManagement.submitTagModal({ waitForClose: false });

    expect(await tagModal.hasError()).toBe(true);

    await tagModal.fillForm({ name: 'edited name' });
    await tagManagement.submitTagModal();

    const tagsInfo = await tagsTable.getDisplayedTagsInfo();
    const oldTag = tagsInfo.find((tagInfo) => tagInfo.name === 'tag-2');
    const newTag = tagsInfo.find((tagInfo) => tagInfo.name === 'edited name');

    expect(oldTag).toBeUndefined();
    expect(newTag).toBeDefined();
  });

  test('closes modal without updating tag', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal, tagsTable } = tagManagement;

    await tagManagement.editTag('tag-3');
    await tagModal.fillForm({
      name: 'canceled-tag',
      description: 'I will not add this tag',
      color: '#FF00CC',
    });
    await tagModal.cancel();

    const tagsInfo = await tagsTable.getDisplayedTagsInfo();
    const uneditedTag = tagsInfo.find((tagInfo) => tagInfo.name === 'tag-3');
    const canceledTag = tagsInfo.find((tagInfo) => tagInfo.name === 'canceled-tag');

    expect(tagsInfo).toHaveLength(5);
    expect(uneditedTag).toBeDefined();
    expect(canceledTag).toBeUndefined();
  });

  test('disables save button when no property changes', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal } = tagManagement;

    await tagManagement.editTag('tag-3');
    await tagModal.fillForm({
      name: 'tag-3',
      description: 'Last but not least',
      color: '#000000',
    });

    expect(await tagModal.isConfirmDisabled()).toBe(true);
  });

  test('enables save button when a property changes', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal } = tagManagement;

    const changedProperties = [
      {
        propertyName: 'name',
        formValues: {
          name: 'changed name',
          description: 'Last but not least',
          color: '#000000',
        },
      },
      {
        propertyName: 'description',
        formValues: {
          name: 'tag-3',
          description: 'changed description',
          color: '#000000',
        },
      },
      {
        propertyName: 'color',
        formValues: {
          name: 'tag-3',
          description: 'Last but not least',
          color: '#FF0000',
        },
      },
    ] as const;

    for (const { propertyName, formValues } of changedProperties) {
      await test.step(`enables save button when ${propertyName} changes`, async () => {
        await tagManagement.editTag('tag-3');
        await tagModal.fillForm(formValues);
        expect(await tagModal.isConfirmDisabled()).toBe(false);
        await tagModal.cancel();
      });
    }
  });
});
