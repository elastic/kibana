/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { expect } from '@kbn/scout/ui';
import { test, ACTIONS_ONLY_ROLE, RULES_V1_AND_V2_READ_ROLE } from '../fixtures';

const RULES_URL_RE = /\/app\/management\/insightsAndAlerting\/triggersActions(\/|$|\?|#)/;
const LOGS_URL_RE = /\/app\/management\/insightsAndAlerting\/triggersActions\/logs(\/|$|\?|#)/;

test.describe('Rules page Logs visibility', { tag: '@local-stateful-classic' }, () => {
  test('hides all heading tabs when the user lacks v2 rules read access', async ({
    page,
    browserAuth,
  }) => {
    await browserAuth.loginWithCustomRole(ACTIONS_ONLY_ROLE);
    await page.gotoApp('rules');
    await page.waitForURL(RULES_URL_RE);

    await expect(page.testSubj.locator('v1RulesTab')).toBeHidden();
    await expect(page.testSubj.locator('v2RulesTab')).toBeHidden();
    await expect(page.testSubj.locator('rulesTab')).toBeHidden();
    await expect(page.testSubj.locator('logsTab')).toBeHidden();
  });

  test('omits the Logs menu item when the user lacks rule-type read access', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginWithCustomRole(ACTIONS_ONLY_ROLE);
    await page.gotoApp('rules');
    await page.waitForURL(RULES_URL_RE);

    await pageObjects.appMenu.openOverflow();
    await expect(page.testSubj.locator('rulesLogsLink')).toBeHidden();
  });

  test('shows the Logs child page with its own heading, back button, no tabs, and no create button', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginWithCustomRole(RULES_V1_AND_V2_READ_ROLE);
    await page.gotoApp('rules');
    await page.waitForURL(RULES_URL_RE);

    await pageObjects.appMenu.clickItem('rulesLogsLink');
    await page.waitForURL(LOGS_URL_RE);

    await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title)).toContainText('Logs');
    await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.back)).toHaveAccessibleName(
      'Back to Rules'
    );
    await expect(page.testSubj.locator('v1RulesTab')).toBeHidden();
    await expect(page.testSubj.locator('v2RulesTab')).toBeHidden();
    await expect(page.testSubj.locator('createRuleButton')).toBeHidden();
  });
});
