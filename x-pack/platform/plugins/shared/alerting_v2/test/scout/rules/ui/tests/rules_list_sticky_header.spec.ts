/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test, testData } from '../fixtures';

const RULE_COUNT = 20;
const RULE_TAG = `scout-sticky-header-${randomUUID()}`;
const UNRELATED_RULE_NAME = `000 unrelated sticky header rule ${RULE_TAG}`;
const UNRELATED_RULE_TAG = `scout-unrelated-sticky-header-${RULE_TAG}`;
const firstRuleId = randomUUID();
const unrelatedRuleId = randomUUID();
const ruleIds = [firstRuleId, ...Array.from({ length: RULE_COUNT - 1 }, () => randomUUID())];
const fixtureRuleIds = [unrelatedRuleId, ...ruleIds];

test.describe('Rules list - sticky app header', { tag: testData.UI_TAG }, () => {
  test.beforeAll(async ({ apiServices }) => {
    const { items, errors } = await apiServices.alertingV2.rules.bulkCreate({
      items: [
        buildCreateRuleData({
          id: unrelatedRuleId,
          enabled: false,
          metadata: { name: UNRELATED_RULE_NAME, tags: [UNRELATED_RULE_TAG] },
        }),
        ...ruleIds.map((id, index) =>
          buildCreateRuleData({
            id,
            enabled: false,
            metadata: { name: `Sticky header rule ${RULE_TAG} ${index}`, tags: [RULE_TAG] },
          })
        ),
      ],
    });

    expect(errors).toStrictEqual([]);
    expect(items).toHaveLength(RULE_COUNT + 1);
    expect(items.map(({ id }) => id).sort()).toStrictEqual([...fixtureRuleIds].sort());
  });

  test.afterAll(async ({ apiServices }) => {
    const { affected_count: affectedCount, errors } = await apiServices.alertingV2.rules.bulkDelete(
      {
        ids: fixtureRuleIds,
      }
    );
    const missingIds = errors.filter(({ error }) => error.code === 'RULE_NOT_FOUND');
    const unexpectedErrors = errors.filter(({ error }) => error.code !== 'RULE_NOT_FOUND');
    expect(unexpectedErrors).toStrictEqual([]);
    expect(affectedCount).toBe(fixtureRuleIds.length - missingIds.length);
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
    await pageObjects.rulesList.contentList.searchFor(RULE_TAG);
    await expect(pageObjects.rulesList.ruleNameLink(unrelatedRuleId)).toBeVisible({
      timeout: testData.UI_SLOW_RENDER_TIMEOUT_MS,
    });
    await pageObjects.rulesList.filterBySingleTag(RULE_TAG);

    const heading = pageObjects.alertingNavigation.pageHeading('rules');
    const table = pageObjects.rulesList.rulesListTable;
    await expect(heading).toBeInViewport();
    await expect(pageObjects.rulesList.ruleNameLink(unrelatedRuleId)).toBeHidden({
      timeout: testData.UI_SLOW_RENDER_TIMEOUT_MS,
    });
    await expect(pageObjects.rulesList.ruleNameLink(firstRuleId)).toBeVisible({
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
