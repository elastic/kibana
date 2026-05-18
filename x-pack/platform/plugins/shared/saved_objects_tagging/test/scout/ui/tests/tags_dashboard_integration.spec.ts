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

test.describe('Dashboard integration', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
  });

  test.beforeEach(async ({ kbnClient, browserAuth, page, pageObjects }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.DASHBOARD);

    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.goto();
    await new SavedObjectsListingPage(page).waitForLoaded();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('allows to manually type tag filter query', async ({ page }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await listingPage.searchForItemWithName('tag:(tag-1)', { escape: false });

    await listingPage.expectItemsCount('dashboard', 2);
    const itemNames = await listingPage.getAllItemNames('dashboard');
    for (const expectedName of [
      'dashboard 3 (tag-1 and tag-3)',
      'dashboard 4 with real data (tag-1)',
    ]) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by selecting a tag in the filter menu', async ({ page }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await listingPage.selectFilterTags('tag-3');

    await listingPage.expectItemsCount('dashboard', 2);
    const itemNames = await listingPage.getAllItemNames('dashboard');
    for (const expectedName of ['dashboard 2 (tag-3)', 'dashboard 3 (tag-1 and tag-3)']) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to filter by multiple tags', async ({ page }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await listingPage.selectFilterTags('tag-2', 'tag-3');

    await listingPage.expectItemsCount('dashboard', 3);
    const itemNames = await listingPage.getAllItemNames('dashboard');
    for (const expectedName of [
      'dashboard 1 (tag-2)',
      'dashboard 2 (tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
    ]) {
      expect(itemNames).toContain(expectedName);
    }
  });

  test('allows to select tags for a new dashboard', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await pageObjects.dashboard.openNewDashboard();

    await page.testSubj.click('dashboardInteractiveSaveMenuItem');
    await page.testSubj.fill('savedObjectTitle', 'my-new-dashboard');
    await pageObjects.tagManagement.selectSavedObjectTags('tag-1', 'tag-3');
    await page.testSubj.click('confirmSaveSavedObjectButton');
    await page.testSubj.locator('confirmSaveSavedObjectButton').waitFor({ state: 'hidden' });

    await pageObjects.dashboard.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-1');
    const itemNames = await listingPage.getAllItemNames('dashboard');
    expect(itemNames).toContain('my-new-dashboard');
  });

  test('allows to create a tag from the tag selector', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await pageObjects.dashboard.openNewDashboard();

    await page.testSubj.click('dashboardInteractiveSaveMenuItem');
    await page.testSubj.fill('savedObjectTitle', 'dashboard-with-new-tag');

    await pageObjects.tagManagement.openCreateTagFromSelector();
    await pageObjects.tagManagement.fillForm({
      name: 'my-new-tag',
      color: '#FFCC33',
      description: '',
    });
    await page.testSubj.click('createModalConfirmButton');
    await pageObjects.tagManagement.getTagModalForm().waitFor({ state: 'hidden' });

    await page.testSubj.click('confirmSaveSavedObjectButton');
    await page.testSubj.locator('confirmSaveSavedObjectButton').waitFor({ state: 'hidden' });

    await pageObjects.dashboard.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('my-new-tag');
    const itemNames = await listingPage.getAllItemNames('dashboard');
    expect(itemNames).toContain('dashboard-with-new-tag');
  });

  test('allows to select tags for an existing dashboard', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await listingPage.clickItemLink('dashboard', 'dashboard 4 with real data (tag-1)');

    await pageObjects.dashboard.switchToEditMode();
    await pageObjects.dashboard.openSettingsFlyout();
    await pageObjects.tagManagement.selectSavedObjectTags('tag-3');
    await pageObjects.dashboard.applyDashboardSettings();
    await pageObjects.dashboard.clickQuickSave();

    await pageObjects.dashboard.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-3');
    const itemNames = await listingPage.getAllItemNames('dashboard');
    expect(itemNames).toContain('dashboard 4 with real data (tag-1)');
  });

  test('retains dashboard saved object tags after quicksave', async ({ page, pageObjects }) => {
    const listingPage = new SavedObjectsListingPage(page);
    await listingPage.clickItemLink('dashboard', 'dashboard 4 with real data (tag-1)');

    await pageObjects.dashboard.switchToEditMode();
    await pageObjects.dashboard.openSettingsFlyout();
    await pageObjects.tagManagement.selectSavedObjectTags('tag-3');
    await pageObjects.dashboard.applyDashboardSettings();
    await pageObjects.dashboard.clickQuickSave();

    await pageObjects.dashboard.openSettingsFlyout();
    await pageObjects.dashboard.setDashboardDescription('this should trigger unsaved changes');
    await pageObjects.dashboard.applyDashboardSettings();
    await pageObjects.dashboard.clickQuickSave();

    await pageObjects.dashboard.goto();
    await listingPage.waitForLoaded();
    await listingPage.selectFilterTags('tag-3');
    const itemNames = await listingPage.getAllItemNames('dashboard');
    expect(itemNames).toContain('dashboard 4 with real data (tag-1)');
  });
});
