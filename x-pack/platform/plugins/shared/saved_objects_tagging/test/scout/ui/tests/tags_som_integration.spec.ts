/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

test.describe('Tags - saved objects management integration', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.SO_MANAGEMENT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.savedObjectsManagement.goto();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('accesses saved objects management from tags with pre-applied filter', async ({
    page,
    pageObjects,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.app('management/kibana/tags'));
    await pageObjects.tagManagement.tagsTable.waitForLoaded();

    const tagRow = page.testSubj.locator('tagsTableRow').filter({
      has: page.locator('[data-test-subj="tagsTableRowName"]').getByText('tag-1', { exact: true }),
    });
    await tagRow.locator('[data-test-subj="tagsTableRowConnectionsLink"]').click();

    await expect(page).toHaveURL(/\/app\/management\/kibana\/objects/);
    await pageObjects.savedObjectsManagement.waitForLoaded();
    await expect(pageObjects.savedObjectsManagement.searchInput).toHaveValue('tag:("tag-1")');
    await expect(pageObjects.savedObjectsManagement.rows).toHaveCount(2);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 1 (tag-1)')
    ).toHaveCount(1);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 3 (tag-1 + tag-3)')
    ).toHaveCount(1);
  });

  test('allows manually typing tag filter query', async ({ pageObjects }) => {
    await pageObjects.savedObjectsManagement.search('tag:(tag-2)');

    await expect(pageObjects.savedObjectsManagement.rows).toHaveCount(2);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 2 (tag-2)')
    ).toHaveCount(1);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 4 (tag-2)')
    ).toHaveCount(1);
  });

  test('allows filtering by selecting a single tag in the filter menu', async ({ pageObjects }) => {
    await pageObjects.savedObjectsManagement.selectFilterTags('tag-1');

    await expect(pageObjects.savedObjectsManagement.rows).toHaveCount(2);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 1 (tag-1)')
    ).toHaveCount(1);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 3 (tag-1 + tag-3)')
    ).toHaveCount(1);
  });

  test('allows filtering by selecting multiple tags in the filter menu', async ({
    pageObjects,
  }) => {
    await pageObjects.savedObjectsManagement.selectFilterTags('tag-2', 'tag-3');

    await expect(pageObjects.savedObjectsManagement.rows).toHaveCount(3);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 2 (tag-2)')
    ).toHaveCount(1);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 3 (tag-1 + tag-3)')
    ).toHaveCount(1);
    await expect(
      pageObjects.savedObjectsManagement.getTitleLink('Visualization 4 (tag-2)')
    ).toHaveCount(1);
  });

  test('displays all tags for an object row', async ({ pageObjects }) => {
    const tagBadges = pageObjects.savedObjectsManagement.getTagBadges(
      'Visualization 3 (tag-1 + tag-3)'
    );
    await expect(tagBadges).toHaveText(['tag-1', 'tag-3']);
  });
});
