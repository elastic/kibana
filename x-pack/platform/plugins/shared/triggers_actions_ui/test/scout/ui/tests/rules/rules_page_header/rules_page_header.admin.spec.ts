/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';

test.describe('Rules Page - Header - Admin', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesPage.goto();
    await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
  });

  test('should filter rule types using search and close modal', async ({ pageObjects }) => {
    await pageObjects.rulesPage.openRuleTypeModal();

    const searchInput = pageObjects.rulesPage.ruleTypeModalSearch;
    await searchInput.fill('log');

    await expect(searchInput).toHaveValue('log');

    await searchInput.clear();
    await expect(searchInput).toHaveValue('');

    await pageObjects.rulesPage.closeRuleTypeModal();

    await expect(pageObjects.rulesPage.ruleTypeModal).toBeHidden();
  });
});
