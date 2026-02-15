/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { t1AnalystRole } from '../../common/roles';
import { loadRule, cleanupRule } from '../../common/api_helpers';
import { waitForPageReady } from '../../common/constants';

test.describe('Alert Test', { tag: [...tags.stateful.classic] }, () => {
  let ruleName: string;
  let ruleId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = await loadRule(kbnClient);
    ruleName = rule.name;
    ruleId = rule.id;
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginWithCustomRole(t1AnalystRole);
    await page.goto(kbnUrl.get('/app/security/rules'));
    await waitForPageReady(page);

    // Click on the rule name
    await page.getByText(ruleName).first().click();
    await page.testSubj.locator('expand-event').first().waitFor({ state: 'visible' });

    // Expand first event
    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj.locator('securitySolutionFlyoutInvestigationGuideButton').click();
    await page.getByText('Get processes').first().click();
  });

  test.afterAll(async ({ kbnClient }) => {
    if (ruleId) {
      await cleanupRule(kbnClient, ruleId);
    }
  });

  test('should be able to run rule investigation guide query', async ({ page, pageObjects }) => {
    await pageObjects.liveQuery.submitQuery();
    await pageObjects.liveQuery.checkResults();
  });

  test('should not be able to run custom query', async ({ page, pageObjects }) => {
    // Intercept the POST request and modify the query
    await page.route('**/api/osquery/live_queries', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postData = request.postDataJSON();
        postData.query = 'select * from processes limit 10';
        await route.continue({ postData: JSON.stringify(postData) });
      } else {
        await route.continue();
      }
    });

    await pageObjects.liveQuery.submitQuery();
    await expect(page.getByText('Forbidden').first()).toBeVisible();
  });
});
