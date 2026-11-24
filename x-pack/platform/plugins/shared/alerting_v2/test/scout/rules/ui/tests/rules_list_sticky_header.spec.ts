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
const UNRELATED_RULE_NAME = `000 unrelated sticky header rule ${RULE_TAG}`;
const UNRELATED_RULE_TAG = `scout-unrelated-sticky-header-${Date.now()}`;
const ruleIds: string[] = [];
let unrelatedRuleId: string;

test.describe('Rules list - sticky app header', { tag: testData.UI_TAG }, () => {
  test.beforeAll(async ({ apiServices }) => {
    const { items, errors } = await apiServices.alertingV2.rules.bulkCreate({
      items: [
        buildCreateRuleData({
          enabled: false,
          metadata: { name: UNRELATED_RULE_NAME, tags: [UNRELATED_RULE_TAG] },
        }),
        ...Array.from({ length: RULE_COUNT }, (_, index) =>
          buildCreateRuleData({
            enabled: false,
            metadata: { name: `Sticky header rule ${RULE_TAG} ${index}`, tags: [RULE_TAG] },
          })
        ),
      ],
    });

    ruleIds.push(...items.map(({ id }) => id));
    const unrelatedRule = items.find(({ metadata }) => metadata.name === UNRELATED_RULE_NAME);
    if (!unrelatedRule) {
      throw new Error(`Bulk creation did not return the unrelated rule ${UNRELATED_RULE_NAME}`);
    }
    unrelatedRuleId = unrelatedRule.id;

    expect(errors).toStrictEqual([]);
    expect(items).toHaveLength(RULE_COUNT + 1);
  });

  test.afterAll(async ({ apiServices }) => {
    if (ruleIds.length > 0) {
      const { affected_count: affectedCount, errors } =
        await apiServices.alertingV2.rules.bulkDelete({
          ids: ruleIds,
        });
      expect(errors).toStrictEqual([]);
      expect(affectedCount).toBe(ruleIds.length);
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
    await pageObjects.rulesList.search(RULE_TAG);
    await expect(pageObjects.rulesList.rulesListShowingLabel).toHaveText(
      'Showing 1-20 of 21 Rules',
      {
        timeout: testData.UI_SLOW_RENDER_TIMEOUT_MS,
      }
    );
    await expect(pageObjects.rulesList.ruleNameLink(unrelatedRuleId)).toBeVisible({
      timeout: testData.UI_SLOW_RENDER_TIMEOUT_MS,
    });
    await pageObjects.rulesList.filterBySingleTag(RULE_TAG);

    const heading = pageObjects.alertingNavigation.pageHeading('rules');
    const table = pageObjects.rulesList.rulesListTable;
    await expect(heading).toBeInViewport();
    await expect(pageObjects.rulesList.rulesListShowingLabel).toHaveText(
      'Showing 1-20 of 20 Rules',
      {
        timeout: testData.UI_SLOW_RENDER_TIMEOUT_MS,
      }
    );
    await expect(pageObjects.rulesList.ruleNameLink(unrelatedRuleId)).toBeHidden();
    for (const ruleId of ruleIds.filter((id) => id !== unrelatedRuleId)) {
      await expect(pageObjects.rulesList.ruleNameLink(ruleId)).toBeVisible({
        timeout: testData.UI_SLOW_RENDER_TIMEOUT_MS,
      });
    }

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
