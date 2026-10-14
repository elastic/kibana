/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe('Initial solution setup', { tag: tags.stateful.classic }, () => {
  // Setup is a one-way, cluster-wide transition. The API and UI suites use separate Scout
  // config sets to get fresh servers; a retry cannot restore state after completion.

  test('selects Search and opens the Search home page', async ({
    browserAuth,
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();

    await page.goto(kbnUrl.get('/'));
    await expect(pageObjects.initialSolutionSetup.searchCard).toBeVisible();

    await pageObjects.initialSolutionSetup.selectSearch();

    await expect.poll(() => page.url()).toContain('/app/elasticsearch/home');
    await expect(page.testSubj.locator('search-getting-started')).toBeVisible();
  });
});
