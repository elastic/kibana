/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { getBoostTestData } from '../../common/boost_test_data';
import { SEARCH_BOOST_READ_ROLE } from '../../common/roles';
import { test } from '../fixtures';

const testData = getBoostTestData('scout-ui');

test.describe('Search boost rules and profiles', { tag: ['@local-serverless-vectordb'] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await testData.setUp(esClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_ROLE);
  });

  test.afterAll(async ({ esClient }) => {
    await testData.tearDown(esClient);
  });

  test('shows the boost rules and what each applies to', async ({ page, pageObjects }) => {
    const { searchBoost } = pageObjects;
    await searchBoost.gotoTab('rules');
    await searchBoost.search(testData.namespace);
    const { rulesTable } = searchBoost;

    await test.step('counts the indices and data streams each rule applies to', async () => {
      // The pattern matches a regular and a hidden index, and the exact name takes the third.
      await expect(searchBoost.row(rulesTable, testData.patternRule)).toContainText('2 indices');
      await expect(searchBoost.row(rulesTable, testData.exactRule)).toContainText('1 index');
      // Backing indices don't count: the rule applies to the data stream.
      await expect(searchBoost.row(rulesTable, testData.dataStreamsRule)).toContainText(
        '1 data stream'
      );
    });

    await test.step('has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });

  test('shows the boost profiles and opens the rules using one', async ({ page, pageObjects }) => {
    const { searchBoost } = pageObjects;
    await searchBoost.gotoTab('profiles');
    await searchBoost.search(testData.namespace);
    const { profilesTable, rulesTable } = searchBoost;
    const indicesProfile = searchBoost.row(profilesTable, testData.indicesProfile);

    await test.step('has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('opens the boost rules filtered by the profile', async () => {
      await indicesProfile.getByTestId('searchBoostProfileRulesLink').click();
      await expect(page).toHaveURL(
        new RegExp(`/search_boost/rules\\?profile=${testData.indicesProfile}$`)
      );
      await expect(searchBoost.row(rulesTable, testData.patternRule)).toBeVisible();
      await expect(searchBoost.row(rulesTable, testData.exactRule)).toBeVisible();
      await expect(searchBoost.row(rulesTable, testData.dataStreamsRule)).toBeHidden();
    });
  });
});
