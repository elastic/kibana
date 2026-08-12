/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const TEST_RUN_ID = Date.now();
const INDEX_THRESHOLD_RULE_NAME = `Scout Rule Snooze Scheduler ${TEST_RUN_ID}`;
const INDEX_THRESHOLD_RULE_TYPE_ID = '.index-threshold';

test.describe(
  'Rule snooze scheduler legacy theme independence',
  { tag: tags.stateful.classic },
  () => {
    let indexThresholdRuleId: string;

    test.beforeAll(async ({ apiServices }) => {
      const indexThresholdRuleResponse = await apiServices.alerting.rules.create({
        name: INDEX_THRESHOLD_RULE_NAME,
        ruleTypeId: INDEX_THRESHOLD_RULE_TYPE_ID,
        consumer: 'alerts',
        enabled: false,
        schedule: { interval: '1m' },
        actions: [],
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000],
          index: ['.kibana'],
          timeField: '@timestamp',
        },
      });

      indexThresholdRuleId = indexThresholdRuleResponse.data.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ apiServices }) => {
      if (!indexThresholdRuleId) {
        return;
      }

      await apiServices.alerting.rules.delete(indexThresholdRuleId);
    });

    test('keeps the scheduler stable without legacy theme CSS', async ({
      pageObjects,
      page,
    }, testInfo) => {
      await pageObjects.ruleDetailsPage.gotoById(indexThresholdRuleId);
      await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(INDEX_THRESHOLD_RULE_NAME);

      await page.testSubj.locator('rulesListNotifyBadge-unsnoozed').click();
      await page.testSubj.locator('ruleAddSchedule').click();

      await expectNoLegacyThemeDependency({
        page,
        target: page.testSubj.locator('ruleSnoozeScheduler'),
        testInfo,
        name: 'rule-snooze-scheduler',
      });
    });
  }
);

// TODO: This test can be removed when
// https://github.com/elastic/kibana/issues/258482 is resolved.
const LEGACY_THEME_LINK_SELECTOR =
  'link[href*="legacy_light_theme.min.css"], link[href*="legacy_dark_theme.min.css"]';

const expectNoLegacyThemeDependency = async ({
  page,
  target,
  testInfo,
  name,
}: {
  page: ScoutPage;
  target: Locator;
  testInfo: {
    attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void>;
  };
  name: string;
}) => {
  await expect(target).toBeVisible();
  await expect(page.testSubj.locator('scheduler-saveSchedule')).toBeEnabled();

  const beforeBox = await expectVisibleBox(target);
  const beforeScreenshot = await target.screenshot();

  await page.evaluate(async (selector) => {
    document.querySelectorAll<HTMLLinkElement>(selector).forEach((link) => link.remove());
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }, LEGACY_THEME_LINK_SELECTOR);

  await expect(target).toBeVisible();
  await expect(page.testSubj.locator('scheduler-saveSchedule')).toBeEnabled();

  const afterBox = await expectVisibleBox(target);
  const afterScreenshot = await target.screenshot();

  await testInfo.attach(`${name}-with-legacy-theme`, {
    body: beforeScreenshot,
    contentType: 'image/png',
  });
  await testInfo.attach(`${name}-without-legacy-theme`, {
    body: afterScreenshot,
    contentType: 'image/png',
  });

  expect(getBoxDimensionDelta(afterBox.width, beforeBox.width)).toBeLessThanOrEqual(0.01);
  expect(getBoxDimensionDelta(afterBox.height, beforeBox.height)).toBeLessThanOrEqual(0.01);
};

const expectVisibleBox = async (target: Locator) => {
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error('Expected target to have a visible bounding box');
  }
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  return box;
};

const getBoxDimensionDelta = (after: number, before: number) => {
  if (before === 0) {
    return after === 0 ? 0 : Infinity;
  }
  return Math.abs(after - before) / before;
};
