/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { SHORTER_TIMEOUT } from '../../../fixtures/constants';
import { getRuleIdByName } from '../../../fixtures/helpers';
import { RULE_NAMES, seedRulesForTests } from '../../../fixtures/rule_seeding';

test.describe(
  'Rules Page - Rules Tab - Viewer',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await seedRulesForTests(apiServices);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.rulesPage.goto();
    });

    test.afterAll(async ({ apiServices }) => {
      for (const name of Object.values(RULE_NAMES)) {
        const id = await getRuleIdByName(apiServices, name);
        if (id) {
          await apiServices.alerting.rules.delete(id).catch(() => {});
        }
      }
    });

    test('should see the Rules Table container', async ({ pageObjects }) => {
      await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
    });

    test('should see a non-editable rule in the Rules Table', async ({ pageObjects }) => {
      const nonEditableRules = pageObjects.rulesPage.getNonEditableRules();
      await expect(nonEditableRules.filter({ hasText: RULE_NAMES.FIRST_RULE_TEST })).toHaveCount(1);
    });

    test('should not show the edit action button for a rule when logged in as viewer', async ({
      pageObjects,
    }) => {
      const nonEditableRules = pageObjects.rulesPage.getNonEditableRules();
      const ruleRow = nonEditableRules.filter({ hasText: RULE_NAMES.FIRST_RULE_TEST });

      await expect(ruleRow).toBeVisible();
      await ruleRow.hover();

      const editActionContainer = pageObjects.rulesPage.getRuleSidebarEditAction(ruleRow);
      await expect(editActionContainer).toBeHidden({ timeout: SHORTER_TIMEOUT });

      const editButton = pageObjects.rulesPage.getEditActionButton(ruleRow);
      await expect(editButton).toBeHidden();
    });
  }
);
