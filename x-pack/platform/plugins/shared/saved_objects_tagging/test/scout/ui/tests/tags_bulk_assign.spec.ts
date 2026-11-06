/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

test.describe('Tags management bulk assign', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ kbnClient, browserAuth, pageObjects }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.BULK_ASSIGN);

    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.tagManagement.goto();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('bulk assigns tags to objects', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { assignFlyout, tagsTable } = tagManagement;

    await tagManagement.openAssignFlyoutForTags(['tag-3', 'tag-4']);
    await assignFlyout.clickResult('visualization', 'ref-to-tag-1');
    await assignFlyout.clickResult('visualization', 'ref-to-tag-1-and-tag-2');
    await tagManagement.confirmAssignFlyout();

    const tag3 = await tagsTable.getDisplayedTagInfo('tag-3');
    const tag4 = await tagsTable.getDisplayedTagInfo('tag-4');

    expect(tag3?.connectionCount).toBe(3);
    expect(tag4?.connectionCount).toBe(2);
  });

  test('bulk unassigns tags from objects', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { assignFlyout, tagsTable } = tagManagement;

    await tagManagement.openAssignFlyoutForTags(['tag-1', 'tag-2']);
    await assignFlyout.clickResult('visualization', 'ref-to-tag-1');
    await assignFlyout.clickResult('visualization', 'ref-to-tag-1');
    await assignFlyout.clickResult('visualization', 'ref-to-tag-1-and-tag-2');
    await tagManagement.confirmAssignFlyout();

    const tag1 = await tagsTable.getDisplayedTagInfo('tag-1');
    const tag2 = await tagsTable.getDisplayedTagInfo('tag-2');

    expect(tag1?.connectionCount).toBe(1);
    expect(tag2?.connectionCount).toBe(1);
  });

  test('cancels bulk assign without changing tag connections', async ({ pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { assignFlyout, tagsTable } = tagManagement;

    const initialTag3 = await tagsTable.getDisplayedTagInfo('tag-3');
    const initialTag4 = await tagsTable.getDisplayedTagInfo('tag-4');

    await tagManagement.openAssignFlyoutForTags(['tag-3', 'tag-4']);
    await assignFlyout.clickResult('visualization', 'ref-to-tag-1');
    await assignFlyout.clickResult('visualization', 'ref-to-tag-1-and-tag-2');
    await tagManagement.cancelAssignFlyout();

    const finalTag3 = await tagsTable.getDisplayedTagInfo('tag-3');
    const finalTag4 = await tagsTable.getDisplayedTagInfo('tag-4');

    expect(finalTag3?.connectionCount).toBe(initialTag3?.connectionCount);
    expect(finalTag4?.connectionCount).toBe(initialTag4?.connectionCount);
  });
});
