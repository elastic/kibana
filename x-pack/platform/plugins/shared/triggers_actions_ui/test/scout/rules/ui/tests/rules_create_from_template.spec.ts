/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SM_BASE = 'management/insightsAndAlerting/triggersActions';
const RULES_CREATE_URL_RE = new RegExp(`/app/${SM_BASE}/create/template/`);

test.describe(
  'Create rule from template',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test('stays on the host mount when selecting a template', async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('rules');
      await expect(page.testSubj.locator('createRuleButton')).toBeVisible({ timeout: 30_000 });
      await page.testSubj.click('createRuleButton');
      await expect(page.testSubj.locator('ruleTypeModal')).toBeVisible();

      const templateTab = page.testSubj.locator('ruleTypeModal').getByText('Templates');
      const hasTemplates = await templateTab.isVisible().catch(() => false);

      test.skip(
        !hasTemplates,
        'No Templates tab available in this config; gap covered by unit test'
      );

      await templateTab.click();

      const firstTemplate = page.testSubj
        .locator('ruleTypeModal')
        .locator('[data-test-subj$="-SelectOption"]')
        .first();
      await expect(firstTemplate).toBeVisible({ timeout: 10_000 });
      await firstTemplate.click();

      await expect(page).toHaveURL(RULES_CREATE_URL_RE);
      expect(page.url()).toContain(`/app/${SM_BASE}/create/template/`);
    });
  }
);
