/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { ES_ARCHIVES, KBN_ARCHIVES, test } from '../fixtures';
import { SavedObjectsListingPage } from '../fixtures/page_objects/saved_objects_listing_page';

test.describe('Visualize integration', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
  });

  test.beforeEach(async ({ kbnClient, browserAuth }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.VISUALIZE);
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('allows to manually type tag filter query', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await pageObjects.visualize.goto();

    await listingPage.waitForLoaded();
    await listingPage.searchForItemWithName('tag:(tag-1)', { escape: false });
    await listingPage.expectItemsCount('visualize', 2);

    const itemNames = await listingPage.getAllItemNames('visualize');
    for (const expectedName of ['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by selecting a tag in the filter menu', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await pageObjects.visualize.goto();

    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-1');
    await listingPage.expectItemsCount('visualize', 2);

    const itemNames = await listingPage.getAllItemNames('visualize');
    for (const expectedName of ['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by multiple tags', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await pageObjects.visualize.goto();

    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-2', 'tag-3');
    await listingPage.expectItemsCount('visualize', 2);

    const itemNames = await listingPage.getAllItemNames('visualize');
    for (const expectedName of ['Visualization 2 (tag-2)', 'Visualization 3 (tag-1 + tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to select tags for a new visualization', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.openSaveModal();
    await pageObjects.visualize.fillVisTitle('my-new-visualization');
    await pageObjects.visualize.selectNoDashboard();
    await pageObjects.tagManagement.selectSavedObjectTags('myextratag');
    await pageObjects.visualize.confirmSave();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('myextratag');
    const itemNames = await listingPage.getAllItemNames('visualize');
    expect(itemNames).toContain('my-new-visualization');
  });

  test('allows to create a tag from the tag selector', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.openSaveModal();
    await pageObjects.visualize.fillVisTitle('visualization-with-new-tag');
    await pageObjects.visualize.selectNoDashboard();

    await pageObjects.tagManagement.openCreateTagFromSelector();
    await pageObjects.tagManagement.fillForm({
      name: 'my-new-tag',
      color: '#FFCC33',
      description: '',
    });
    await page.testSubj.click('createModalConfirmButton');
    await pageObjects.tagManagement.getTagModalForm().waitFor({ state: 'hidden' });
    await pageObjects.visualize.confirmSave();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('my-new-tag');
    const itemNames = await listingPage.getAllItemNames('visualize');
    expect(itemNames).toContain('visualization-with-new-tag');
  });

  test('allows to select tags for an existing visualization', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);

    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.openSaveModal();
    await pageObjects.visualize.fillVisTitle('MarkdownViz');
    await pageObjects.visualize.selectNoDashboard();
    await pageObjects.visualize.confirmSave();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.clickItemLink('visualize', 'MarkdownViz');
    await pageObjects.visualize.openSaveModal();
    await pageObjects.tagManagement.selectSavedObjectTags('myextratag');
    await pageObjects.visualize.confirmSave();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('myextratag');
    const itemNames = await listingPage.getAllItemNames('visualize');
    expect(itemNames).toContain('MarkdownViz');
  });
});
