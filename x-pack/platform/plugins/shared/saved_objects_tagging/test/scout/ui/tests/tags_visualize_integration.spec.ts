/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { ES_ARCHIVES, KBN_ARCHIVES, test } from '../fixtures';

test.describe('Visualize integration', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.VISUALIZE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('allows to manually type tag filter query', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await pageObjects.visualize.goto();

    await listingPage.waitForLoaded();
    await listingPage.searchForItemWithName('tag:(tag-1)', { escape: false });
    await expect(listingPage.getItemLinks('visualize')).toHaveCount(2);

    const itemNames = await listingPage.getAllItemNames('visualize');
    for (const expectedName of ['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by selecting a tag in the filter menu', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await pageObjects.visualize.goto();

    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-1');
    await expect(listingPage.getItemLinks('visualize')).toHaveCount(2);

    const itemNames = await listingPage.getAllItemNames('visualize');
    for (const expectedName of ['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by multiple tags', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await pageObjects.visualize.goto();

    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-2', 'tag-3');
    await expect(listingPage.getItemLinks('visualize')).toHaveCount(2);

    const itemNames = await listingPage.getAllItemNames('visualize');
    for (const expectedName of ['Visualization 2 (tag-2)', 'Visualization 3 (tag-1 + tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to select tags for a new visualization', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.openSaveModal();
    await pageObjects.saveModal.fillTitle('my-new-visualization');
    await pageObjects.saveModal.selectNoDashboard();
    await pageObjects.tagManagement.selectSavedObjectTags('myextratag');
    await pageObjects.saveModal.confirm();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('myextratag');
    const itemNames = await listingPage.getAllItemNames('visualize');
    expect(itemNames).toContain('my-new-visualization');
  });

  test('allows to create a tag from the tag selector', async ({ page, pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;
    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.openSaveModal();
    await pageObjects.saveModal.fillTitle('visualization-with-new-tag');
    await pageObjects.saveModal.selectNoDashboard();

    await pageObjects.tagManagement.openCreateTagFromSelector();
    await pageObjects.tagManagement.tagModal.fillForm({
      name: 'my-new-tag',
      color: '#FFCC33',
      description: '',
    });
    await page.testSubj.click('createModalConfirmButton');
    await pageObjects.tagManagement.tagModal.form.waitFor({ state: 'hidden' });
    await pageObjects.saveModal.confirm();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('my-new-tag');
    const itemNames = await listingPage.getAllItemNames('visualize');
    expect(itemNames).toContain('visualization-with-new-tag');
  });

  test('allows to select tags for an existing visualization', async ({ pageObjects }) => {
    const listingPage = pageObjects.savedObjectsListing;

    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.openSaveModal();
    await pageObjects.saveModal.fillTitle('MarkdownViz');
    await pageObjects.saveModal.selectNoDashboard();
    await pageObjects.saveModal.confirm();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.clickItemLink('visualize', 'MarkdownViz');
    await pageObjects.visualize.openSaveModal();
    await pageObjects.tagManagement.selectSavedObjectTags('myextratag');
    await pageObjects.saveModal.confirm();

    await pageObjects.visualize.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('myextratag');
    const itemNames = await listingPage.getAllItemNames('visualize');
    expect(itemNames).toContain('MarkdownViz');
  });
});
