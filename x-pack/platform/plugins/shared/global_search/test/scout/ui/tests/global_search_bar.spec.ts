/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { KBN_ARCHIVES } from '../fixtures/constants';

/**
 * IMPORTANT: These tests only work in 'classic' navigation mode. Once https://github.com/elastic/kibana/pull/251436 is merged, we might need to revisit this and make them work in 'solution' navigation as well.
 */
test.describe('GlobalSearchBar', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.SEARCH_SYNTAX);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.globalSearch.navigateToHome();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('shows the popover on focus', async ({ pageObjects }) => {
    await pageObjects.globalSearch.focus();
    expect(await pageObjects.globalSearch.isPopoverDisplayed()).toBe(true);

    await pageObjects.globalSearch.blur();
    expect(await pageObjects.globalSearch.isPopoverDisplayed()).toBe(false);
  });

  test('redirects to the correct page', async ({ page, pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:application discover');
    await expect(pageObjects.globalSearch.resultLabels).not.toHaveCount(0);
    await pageObjects.globalSearch.clickOnOption(0);

    expect(page.url()).toContain('discover');
  });

  test('shows a suggestion when searching for a term matching a type', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('dashboard');
    await expect(
      pageObjects.globalSearch.resultLabels.filter({ hasText: 'type: dashboard' })
    ).toBeVisible();

    await pageObjects.globalSearch.clickOnOption(0);

    const searchTerm = await pageObjects.globalSearch.getFieldValue();
    expect(searchTerm).toBe('type:dashboard');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'dashboard 1 (tag-2)',
      'dashboard 2 (tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
      'dashboard 4 (tag-special-chars)',
    ]);
  });

  test('shows a suggestion when searching for a term matching a tag name', async ({
    pageObjects,
  }) => {
    await pageObjects.globalSearch.searchFor('tag-1');
    await expect(
      pageObjects.globalSearch.resultLabels.filter({ hasText: 'tag: tag-1' })
    ).toBeVisible();

    await pageObjects.globalSearch.clickOnOption(0);

    const searchTerm = await pageObjects.globalSearch.getFieldValue();
    expect(searchTerm).toBe('tag:tag-1');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'Visualization 1 (tag-1)',
      'Visualization 3 (tag-1 + tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
    ]);
  });

  test('allows to filter by type', async ({ pageObjects }) => {
    await pageObjects.globalSearch.navigateToHome();
    await pageObjects.globalSearch.searchFor('type:dashboard');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'dashboard 1 (tag-2)',
      'dashboard 2 (tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
      'dashboard 4 (tag-special-chars)',
    ]);
  });

  test('allows to filter by multiple types', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:(dashboard OR visualization)');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'Visualization 1 (tag-1)',
      'Visualization 2 (tag-2)',
      'Visualization 3 (tag-1 + tag-3)',
      'Visualization 4 (tag-2)',
      'My awesome vis (tag-4)',
      'dashboard 1 (tag-2)',
      'dashboard 2 (tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
      'dashboard 4 (tag-special-chars)',
    ]);
  });

  test('allows to filter by tag', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('tag:tag-1');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'Visualization 1 (tag-1)',
      'Visualization 3 (tag-1 + tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
    ]);
  });

  test('allows to filter by multiple tags', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('tag:tag-1 tag:tag-3');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'Visualization 1 (tag-1)',
      'Visualization 3 (tag-1 + tag-3)',
      'dashboard 2 (tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
    ]);
  });

  test('allows to filter by type and tag', async ({ pageObjects }) => {
    await pageObjects.globalSearch.navigateToHome();
    await pageObjects.globalSearch.searchFor('type:dashboard tag:tag-3');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'dashboard 2 (tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
    ]);
  });

  test('allows to filter by multiple types and tags', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor(
      'type:(dashboard OR visualization) tag:(tag-1 OR tag-3)'
    );

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'Visualization 1 (tag-1)',
      'Visualization 3 (tag-1 + tag-3)',
      'dashboard 2 (tag-3)',
      'dashboard 3 (tag-1 and tag-3)',
    ]);
  });

  test('allows to filter by term and type', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:visualization awesome');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText(['My awesome vis (tag-4)']);
  });

  test('allows to filter by term and tag', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('tag:tag-4 awesome');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText(['My awesome vis (tag-4)']);
  });

  test('allows to filter by tags containing special characters', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('tag:"my%tag"');

    await expect(pageObjects.globalSearch.resultLabels).toHaveText([
      'dashboard 4 (tag-special-chars)',
    ]);
  });

  test('returns no results when searching for an unknown tag', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('tag:unknown');

    expect(await pageObjects.globalSearch.isNoResultsPlaceholderDisplayed()).toBe(true);
  });

  test('returns no results when searching for an unknown type', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:unknown');

    expect(await pageObjects.globalSearch.isNoResultsPlaceholderDisplayed()).toBe(true);
  });
});
