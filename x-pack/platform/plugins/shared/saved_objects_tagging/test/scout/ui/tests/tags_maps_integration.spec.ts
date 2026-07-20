/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

test.describe('Maps integration', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ kbnClient, browserAuth, kbnUrl, page, pageObjects }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.MAPS);

    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.app('maps'));
    await pageObjects.savedObjectsListing.waitForLoaded();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('allows to manually type tag filter query', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await listingPage.searchForItemWithName('tag:(tag-1)', { escape: false });

    await expect(listingPage.getItemLinks('map')).toHaveCount(2);
    const itemNames = await listingPage.getAllItemNames('map');
    for (const expectedName of ['map 3 (tag-1 and tag-3)', 'map 4 (tag-1)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by selecting a tag in the filter menu', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await listingPage.selectFilterTags('tag-3');

    await expect(listingPage.getItemLinks('map')).toHaveCount(2);
    const itemNames = await listingPage.getAllItemNames('map');
    for (const expectedName of ['map 2 (tag-3)', 'map 3 (tag-1 and tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by multiple tags', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await listingPage.selectFilterTags('tag-2', 'tag-3');

    await expect(listingPage.getItemLinks('map')).toHaveCount(3);
    const itemNames = await listingPage.getAllItemNames('map');
    for (const expectedName of ['map 1 (tag-2)', 'map 2 (tag-3)', 'map 3 (tag-1 and tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to select tags for a new map', async ({ page, pageObjects, kbnUrl }) => {
    await pageObjects.maps.gotoNewMap();

    await pageObjects.maps.saveButton.click();
    await pageObjects.maps.savedObjectTitleInput.fill('my-new-map');
    await pageObjects.saveModal.selectNoDashboard();
    await pageObjects.tagManagement.selectSavedObjectTags('tag-1', 'tag-3');
    await pageObjects.maps.confirmSaveButton.click();
    await pageObjects.maps.confirmSaveButton.waitFor({ state: 'hidden' });

    await page.goto(kbnUrl.app('maps'));
    await pageObjects.savedObjectsListing.waitForLoaded();
    await pageObjects.savedObjectsListing.selectFilterTags('tag-1');
    const itemNames = await pageObjects.savedObjectsListing.getAllItemNames('map');
    expect(itemNames).toContain('my-new-map');
  });

  test('allows to create a tag from the tag selector', async ({ page, pageObjects, kbnUrl }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await pageObjects.maps.gotoNewMap();

    await pageObjects.maps.saveButton.click();
    await pageObjects.maps.savedObjectTitleInput.fill('map-with-new-tag');
    await pageObjects.saveModal.selectNoDashboard();
    await pageObjects.tagManagement.openCreateTagFromSelector();
    await expect(pageObjects.tagManagement.tagModal.form).toBeVisible();
    await pageObjects.tagManagement.tagModal.fillForm({
      name: 'my-new-tag',
      color: '#FFCC33',
      description: '',
    });
    await page.testSubj.click('createModalConfirmButton');
    await pageObjects.tagManagement.tagModal.form.waitFor({ state: 'hidden' });
    await pageObjects.maps.confirmSaveButton.click();
    await pageObjects.maps.confirmSaveButton.waitFor({ state: 'hidden' });

    await page.goto(kbnUrl.app('maps'));
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('my-new-tag');
    const itemNames = await listingPage.getAllItemNames('map');
    expect(itemNames).toContain('map-with-new-tag');
  });

  test('allows to select tags for an existing map', async ({ page, pageObjects, kbnUrl }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await listingPage.clickItemLink('map', 'map 4 (tag-1)');
    await pageObjects.maps.waitForRenderComplete();

    await pageObjects.maps.saveButton.click();
    await pageObjects.tagManagement.selectSavedObjectTags('tag-3');
    await pageObjects.maps.confirmSaveButton.click();
    await pageObjects.maps.confirmSaveButton.waitFor({ state: 'hidden' });

    await page.goto(kbnUrl.app('maps'));
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-3');
    const itemNames = await listingPage.getAllItemNames('map');
    expect(itemNames).toContain('map 4 (tag-1)');

    await page.goto(kbnUrl.app('maps'));
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-1');
    const itemNamesByOriginalTag = await listingPage.getAllItemNames('map');
    expect(itemNamesByOriginalTag).toContain('map 4 (tag-1)');
  });
});
