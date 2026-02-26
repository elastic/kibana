/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { t1AnalystRole } from '../../common/roles';
import { loadRule, cleanupRule } from '../../common/api_helpers';
import { waitForAlerts } from '../../common/constants';

test.describe('Alert Test', { tag: [...tags.stateful.classic] }, () => {
  let ruleId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = await loadRule(kbnClient);
    ruleId = rule.id;
  });

  test.afterAll(async ({ kbnClient }) => {
    if (ruleId) {
      await cleanupRule(kbnClient, ruleId);
    }
  });

  test('should be able to run rule investigation guide query', async ({
    page,
    pageObjects,
    browserAuth,
    kbnUrl,
    kbnClient,
  }) => {
    test.setTimeout(600_000);
    await browserAuth.loginWithCustomRole(t1AnalystRole);
    await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}`));
    await waitForAlerts(page, kbnClient, ruleId, { timeout: 480_000 });

    // eslint-disable-next-line playwright/no-nth-methods -- first event in list
    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj
      .locator('securitySolutionFlyoutInvestigationGuideButton')
      .waitFor({ state: 'visible', timeout: 30_000 });
    await page.testSubj.locator('securitySolutionFlyoutInvestigationGuideButton').click();
    await page.getByRole('button', { name: 'Get processes' }).click();

    await pageObjects.liveQuery.submitQuery();
    await pageObjects.liveQuery.checkResults();
  });

  test('should not be able to run custom query', async ({
    page,
    pageObjects,
    browserAuth,
    kbnUrl,
    kbnClient,
  }) => {
    test.setTimeout(600_000);
    await browserAuth.loginWithCustomRole(t1AnalystRole);
    await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}`));
    await waitForAlerts(page, kbnClient, ruleId, { timeout: 480_000 });

    // eslint-disable-next-line playwright/no-nth-methods -- first event in list
    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj
      .locator('securitySolutionFlyoutInvestigationGuideButton')
      .waitFor({ state: 'visible', timeout: 30_000 });
    await page.testSubj.locator('securitySolutionFlyoutInvestigationGuideButton').click();
    await page.getByRole('button', { name: 'Get processes' }).click();

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

    await pageObjects.liveQuery.clickSubmit();
    await expect(page.testSubj.locator('euiToastHeader__title').getByText('Forbidden')).toBeVisible(
      {
        timeout: 30_000,
      }
    );
  });
});
