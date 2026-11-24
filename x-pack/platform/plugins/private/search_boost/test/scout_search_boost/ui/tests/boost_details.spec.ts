/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { escapeRegExp } from 'lodash';
import { getBoostTestData } from '../../common/boost_test_data';
import { SEARCH_BOOST_READ_ROLE } from '../../common/roles';
import { test } from '../fixtures';

const testData = getBoostTestData('scout-ui-details');

test.describe('Search boost details pages', { tag: ['@local-serverless-vectordb'] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await testData.setUp(esClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_ROLE);
  });

  test.afterAll(async ({ esClient }) => {
    await testData.tearDown(esClient);
  });

  test('opens a rule from its table and shows what it applies to', async ({
    page,
    pageObjects,
  }) => {
    const { searchBoost } = pageObjects;
    await searchBoost.gotoTab('rules');
    await searchBoost.search(testData.namespace);

    await test.step('opens the rule from its name', async () => {
      await searchBoost
        .row(searchBoost.rulesTable, testData.patternRule)
        .getByTestId('searchBoostRuleLink')
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/search_boost/rules/${escapeRegExp(testData.patternRule)}$`)
      );
      await expect(searchBoost.headerTitle).toHaveText(testData.patternRule);
    });

    await test.step('lists the matching indices', async () => {
      await expect(
        page
          .getByTestId('searchBoostMatchesTable')
          .getByText(testData.productsIndex, { exact: true })
      ).toBeVisible();
    });

    await test.step('has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });

  test("opens a rule's profile and lists the rules using it", async ({ page, pageObjects }) => {
    const { searchBoost } = pageObjects;
    await searchBoost.gotoDetails('rules', testData.patternRule);

    await test.step("opens the profile from the rule's settings", async () => {
      await searchBoost.setting(searchBoost.ruleSettings, 'profile').getByRole('link').click();
      await expect(searchBoost.headerTitle).toHaveText(testData.indicesProfile);
    });

    await test.step('lists the rules using the profile', async () => {
      for (const rule of [
        testData.patternRule,
        testData.exactRule,
        testData.priorityExactRule,
        testData.priorityWildcardRule,
      ]) {
        await expect(searchBoost.row(searchBoost.profileRulesTable, rule)).toBeVisible();
      }
      await expect(
        searchBoost.row(searchBoost.profileRulesTable, testData.dataStreamsRule)
      ).toBeHidden();
    });

    await test.step('has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });
});
