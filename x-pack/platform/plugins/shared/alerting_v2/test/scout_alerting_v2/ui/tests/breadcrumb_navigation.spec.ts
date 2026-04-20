/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Breadcrumb navigation', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.ruleForm.gotoCreate();
  });

  test('clicking the "Rules" breadcrumb navigates to the rules list without duplicating the path', async ({
    page,
    pageObjects,
  }) => {
    await test.step('verify "Rules" breadcrumb is visible on the create page', async () => {
      const rulesBreadcrumb = pageObjects.ruleForm.breadcrumb('Rules');
      await expect(rulesBreadcrumb).toBeVisible();
    });

    await test.step('click the "Rules" breadcrumb and verify navigation', async () => {
      const rulesBreadcrumb = pageObjects.ruleForm.breadcrumb('Rules');
      await rulesBreadcrumb.click();
      expect(page.url()).toContain('/app/management/alertingV2/rules');
      expect(page.url()).not.toContain('rules/app/');
    });
  });
});
