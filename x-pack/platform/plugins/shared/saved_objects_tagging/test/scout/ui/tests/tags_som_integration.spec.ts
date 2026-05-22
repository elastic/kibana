/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

const getSavedObjectsTableRows = (page: ScoutPage) =>
  page.testSubj.locator('~savedObjectsTableRow');

const getSavedObjectTitleLink = (page: ScoutPage, title: string) =>
  page.testSubj
    .locator('savedObjectsTableRowTitle')
    .getByRole('link', { name: title, exact: true });

const getSavedObjectSearchInput = (page: ScoutPage) =>
  page.locator(
    '[data-test-subj="savedObjectSearchBar"] input, input[data-test-subj="savedObjectSearchBar"]'
  );

const waitForSavedObjectsTable = async (page: ScoutPage) => {
  await page.testSubj.waitForSelector('savedObjectSearchBar');
  await getSavedObjectSearchInput(page).waitFor({ state: 'visible' });
  await page.testSubj.waitForSelector('savedObjectsTableRowTitle');
};

const selectTagsInFilter = async (page: ScoutPage, ...tagNames: string[]) => {
  // EUI renders this filter button with aria-label "Tags Selection" (no dedicated test-subj).
  // Regex matches the visible "Tags" text regardless of the i18n hint appended to aria-label.
  await page.getByRole('button', { name: /Tags/i }).click();
  for (const tagName of tagNames) {
    await page.testSubj.click(`tag-searchbar-option-${tagName.replace(' ', '_')}`);
  }
  await page.testSubj.click('savedObjectSearchBar');
};

test.describe('Tags - saved objects management integration', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.SO_MANAGEMENT);
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.app('management/kibana/objects'));
    await waitForSavedObjectsTable(page);
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
    await waitForSavedObjectsTable(page);
    await expect(getSavedObjectSearchInput(page)).toHaveValue('tag:("tag-1")');
    await expect(getSavedObjectsTableRows(page)).toHaveCount(2);
    await expect(getSavedObjectTitleLink(page, 'Visualization 1 (tag-1)')).toHaveCount(1);
    await expect(getSavedObjectTitleLink(page, 'Visualization 3 (tag-1 + tag-3)')).toHaveCount(1);
  });

  test('allows manually typing tag filter query', async ({ page }) => {
    const searchInput = getSavedObjectSearchInput(page);
    await searchInput.fill('tag:(tag-2)');
    await searchInput.press('Enter');

    await expect(getSavedObjectsTableRows(page)).toHaveCount(2);
    await expect(getSavedObjectTitleLink(page, 'Visualization 2 (tag-2)')).toHaveCount(1);
    await expect(getSavedObjectTitleLink(page, 'Visualization 4 (tag-2)')).toHaveCount(1);
  });

  test('allows filtering by selecting a single tag in the filter menu', async ({ page }) => {
    await selectTagsInFilter(page, 'tag-1');

    await expect(getSavedObjectsTableRows(page)).toHaveCount(2);
    await expect(getSavedObjectTitleLink(page, 'Visualization 1 (tag-1)')).toHaveCount(1);
    await expect(getSavedObjectTitleLink(page, 'Visualization 3 (tag-1 + tag-3)')).toHaveCount(1);
  });

  test('allows filtering by selecting multiple tags in the filter menu', async ({ page }) => {
    await selectTagsInFilter(page, 'tag-2', 'tag-3');

    await expect(getSavedObjectsTableRows(page)).toHaveCount(3);
    await expect(getSavedObjectTitleLink(page, 'Visualization 2 (tag-2)')).toHaveCount(1);
    await expect(getSavedObjectTitleLink(page, 'Visualization 3 (tag-1 + tag-3)')).toHaveCount(1);
    await expect(getSavedObjectTitleLink(page, 'Visualization 4 (tag-2)')).toHaveCount(1);
  });

  test('displays all tags for an object row', async ({ page }) => {
    const row = page.testSubj.locator('~savedObjectsTableRow').filter({
      has: page.testSubj
        .locator('savedObjectsTableRowTitle')
        .getByText('Visualization 3 (tag-1 + tag-3)'),
    });
    await expect(
      row.locator('[data-test-subj="listingTableRowTags"] [data-test-subj^="tag-badge-"]')
    ).toHaveText(['tag-1', 'tag-3']);
  });
});
