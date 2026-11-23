/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test, testData } from '../fixtures';

const RULE_COUNT = 20;
const RULE_TAG = `scout-sticky-header-${Date.now()}`;
const ruleIds: string[] = [];

test.describe('Rules list - sticky app header', { tag: testData.UI_TAG }, () => {
  test.beforeAll(async ({ apiServices }) => {
    for (let index = 0; index < RULE_COUNT; index++) {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          enabled: false,
          metadata: { name: `Sticky header rule ${RULE_TAG} ${index}`, tags: [RULE_TAG] },
        })
      );
      ruleIds.push(rule.id);
    }
  });

  test.afterAll(async ({ apiServices }) => {
    if (ruleIds.length > 0) {
      await apiServices.alertingV2.rules.bulkDelete({ ids: ruleIds });
    }
  });

  test('keeps the page heading pinned while the rules list scrolls', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await browserAuth.loginAsRuleViewer();
    await pageObjects.rulesList.goto();
    await expect(pageObjects.rulesList.rulesListTable).toBeVisible();
    await pageObjects.rulesList.filterBySingleTag(RULE_TAG);

    const heading = pageObjects.alertingNavigation.pageHeading('rules');
    const table = pageObjects.rulesList.rulesListTable;
    await expect(heading).toBeInViewport();
    await expect(table).toContainText('Sticky header rule', {
      timeout: testData.UI_SLOW_RENDER_TIMEOUT_MS,
    });

    const tableTopBeforeScroll = await table.evaluate(
      (element) => element.getBoundingClientRect().top
    );
    await pageObjects.rulesList.scrollRulesListBy(150);
    await expect
      .poll(() => table.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(tableTopBeforeScroll);
    await expect(heading).toBeInViewport();

    const headingTopAfterHeaderIsPinned = await heading.evaluate(
      (element) => element.getBoundingClientRect().top
    );
    const tableTopAfterHeaderIsPinned = await table.evaluate(
      (element) => element.getBoundingClientRect().top
    );

    await pageObjects.rulesList.scrollRulesListBy(300);

    await expect
      .poll(() => table.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(tableTopAfterHeaderIsPinned - 100);
    await expect
      .poll(() => heading.evaluate((element) => element.getBoundingClientRect().top))
      .toBeCloseTo(headingTopAfterHeaderIsPinned, 0);
    await expect(heading).toBeVisible();
  });
});
