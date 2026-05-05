/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

const testIndexName = `index-test-${Math.random()}`;

test.describe('Home page', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.goto();
  });

  test.afterAll(async ({ esClient, log }) => {
    try {
      await esClient.indices.delete({ index: testIndexName });
    } catch (e: any) {
      log.debug(`Index cleanup failed for ${testIndexName}: ${e.message}`);
    }
  });

  test('Loads the app and renders the indices tab by default', async ({
    pageObjects,
    log,
    page,
  }) => {
    await log.debug('Checking for section heading to say Index Management.');

    const headingText = await pageObjects.indexManagement.sectionHeadingText();
    expect(headingText).toBe('Index Management');

    // Verify url
    expect(page.url()).toContain('/indices');

    // Verify content
    await expect(page.testSubj.locator('indicesList')).toBeVisible();
    await expect(page.testSubj.locator('reloadIndicesButton')).toBeVisible();
  });

  test('Indices - renders the indices tab', async ({ pageObjects, page }) => {
    // Navigate to the indices tab
    await pageObjects.indexManagement.changeTabs('indicesTab');

    // Verify url
    expect(page.url()).toContain('/indices');

    // Verify content - wait for table to be visible
    await expect(page.testSubj.locator('indexTable')).toBeVisible();
  });

  test('Indices - can create an index', async ({ pageObjects }) => {
    await pageObjects.indexManagement.clickCreateIndexButton();
    await pageObjects.indexManagement.setCreateIndexName(testIndexName);
    await pageObjects.indexManagement.setCreateIndexMode('Lookup');
    await pageObjects.indexManagement.clickCreateIndexSaveButton();
    await expect(pageObjects.indexManagement.indexLink(testIndexName)).toBeVisible({
      timeout: 30000,
    });
  });

  test('Data streams - renders the data streams tab', async ({ pageObjects, page }) => {
    // Navigate to the data streams tab
    await pageObjects.indexManagement.changeTabs('data_streamsTab');

    // Verify url
    expect(page.url()).toContain('/data_streams');

    // Verify content - wait for table to be visible
    await expect(page.testSubj.locator('dataStreamTable')).toBeVisible();
  });

  test('Index templates - renders the index templates tab', async ({ pageObjects, page }) => {
    // Navigate to the index templates tab
    await pageObjects.indexManagement.changeTabs('templatesTab');

    // Verify url
    expect(page.url()).toContain('/templates');

    // Verify content
    await expect(page.testSubj.locator('templateList')).toBeVisible();
  });

  test('Component templates - renders the component templates tab', async ({
    pageObjects,
    page,
  }) => {
    // Navigate to the component templates tab
    await pageObjects.indexManagement.changeTabs('component_templatesTab');

    // Verify url
    expect(page.url()).toContain('/component_templates');

    // Verify content. Component templates may have been created by other apps, e.g. Ingest Manager,
    // so we don't make any assertion about the presence or absence of component templates.
    await expect(page.testSubj.locator('componentTemplateList')).toBeVisible();
  });

  test('Enrich policies - renders the enrich policies tab', async ({ pageObjects, page }) => {
    // Navigate to the enrich policies tab
    await pageObjects.indexManagement.changeTabs('enrich_policiesTab');

    // Verify url
    expect(page.url()).toContain('/enrich_policies');

    // Verify content
    await expect(page.testSubj.locator('sectionEmpty')).toBeVisible();
  });
});
