/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

test.describe('Tags management bulk actions', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ kbnClient, browserAuth, page, kbnUrl, pageObjects }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);

    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.app('management/kibana/tags'));
    await pageObjects.tagManagement.tagsTable.waitForLoaded();
  });

  test('deletes multiple tags', async ({ page, pageObjects }) => {
    const { tagsTable } = pageObjects.tagManagement;

    const initialDisplayedTags = await tagsTable.getDisplayedTagNames();

    await tagsTable.selectTagByName('tag-1');
    await tagsTable.selectTagByName('tag-3');
    await tagsTable.runBulkAction('delete');
    await page.testSubj.click('confirmModalConfirmButton');
    await tagsTable.waitForLoaded();

    const displayedTags = await tagsTable.getDisplayedTagNames();
    expect(displayedTags).toHaveLength(initialDisplayedTags.length - 2);
    expect(displayedTags).toStrictEqual(['my-favorite-tag', 'tag with whitespace', 'tag-2']);
  });

  test('cancels deleting multiple tags', async ({ page, pageObjects }) => {
    const { tagsTable } = pageObjects.tagManagement;

    const initialDisplayedTags = await tagsTable.getDisplayedTagNames();

    await tagsTable.selectTagByName('tag-1');
    await tagsTable.selectTagByName('tag-3');
    await tagsTable.runBulkAction('delete');
    await page.testSubj.click('confirmModalCancelButton');
    await tagsTable.waitForLoaded();

    const displayedTags = await tagsTable.getDisplayedTagNames();
    expect(displayedTags).toStrictEqual(initialDisplayedTags);
  });

  test('clears current selection', async ({ pageObjects }) => {
    const { tagsTable } = pageObjects.tagManagement;

    await tagsTable.selectTagByName('tag-1');
    await tagsTable.selectTagByName('tag-3');
    await tagsTable.runBulkAction('clear_selection');
    await expect(tagsTable.bulkActionsButton).toBeHidden();
  });
});
