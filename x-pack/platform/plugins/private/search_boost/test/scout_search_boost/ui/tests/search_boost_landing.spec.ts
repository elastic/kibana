/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  ONLY_READ_BOOST_PROFILES_ROLE,
  ONLY_READ_BOOST_RULES_ROLE,
  SEARCH_BOOST_READ_ROLE,
} from '../../common/roles';
import { test } from '../fixtures';

test.describe('Search boost landing', { tag: ['@local-serverless-vectordb'] }, () => {
  test('a user with read access opens the landing from the nav link', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    const { chrome, searchBoost } = pageObjects;
    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_ROLE);
    await searchBoost.gotoHome();
    await searchBoost.openDataManagementNav();

    await test.step('opens the landing from the nav link', async () => {
      await searchBoost.searchBoostNavItem.click();
      await expect(page).toHaveURL(/\/app\/management\/data\/search_boost/);
      await expect(chrome.pageTitle).toHaveText('Search boost');
      await expect(searchBoost.description).toBeVisible();
    });

    await test.step('landing has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });

  for (const [privilege, role] of [
    ['read_boost_profiles', ONLY_READ_BOOST_PROFILES_ROLE],
    ['read_boost_rules', ONLY_READ_BOOST_RULES_ROLE],
  ] as const) {
    test(`a user with only ${privilege} does not see the nav link`, async ({
      browserAuth,
      pageObjects,
    }) => {
      const { searchBoost } = pageObjects;
      await browserAuth.loginWithCustomRole(role);
      await searchBoost.gotoHome();
      await searchBoost.openDataManagementNav();

      await expect(searchBoost.esqlViewsNavItem).toBeVisible();
      await expect(searchBoost.searchBoostNavItem).toBeHidden();
    });
  }
});
