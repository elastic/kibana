/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test, testData } from '../fixtures';

const { POLL_TIMEOUT_MS } = testData;

// A suite-owned space keeps the Rules tab's first page free of runs from other suites' rules.
const SPACE_ID = 'eh-rule-search';

test.describe('Execution history — rule search', { tag: testData.UI_TAG }, () => {
  let matchingRuleName: string;
  let otherRuleName: string;

  test.beforeAll(async ({ apiServices }) => {
    const runId = Date.now();
    matchingRuleName = `EH Search Match ${runId}`;
    otherRuleName = `EH Search Other ${runId}`;

    await apiServices.spaces.delete(SPACE_ID);
    await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });

    const matchingRule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: matchingRuleName } }),
      { spaceId: SPACE_ID }
    );
    const otherRule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: otherRuleName } }),
      { spaceId: SPACE_ID }
    );

    await apiServices.alertingV2.ruleRunner.waitForExecutions({
      ruleId: matchingRule.id,
      runs: 1,
      spaceId: SPACE_ID,
    });
    await apiServices.alertingV2.ruleRunner.waitForExecutions({
      ruleId: otherRule.id,
      runs: 1,
      spaceId: SPACE_ID,
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAlertingViewer();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_ID);
  });

  test('filters the Rules tab by rule name', async ({ pageObjects }) => {
    const { executionHistory } = pageObjects;
    await executionHistory.goto(SPACE_ID);

    await test.step('searching by name lists only the matching rule', async () => {
      await executionHistory.searchRules(matchingRuleName);

      await expect(executionHistory.ruleExecutionsTable).toContainText(matchingRuleName, {
        timeout: POLL_TIMEOUT_MS,
      });
      await expect(executionHistory.ruleExecutionsTable).not.toContainText(otherRuleName);
    });

    await test.step('a search that matches nothing shows the empty state', async () => {
      await executionHistory.searchRules(`no-such-rule-${Date.now()}`);

      await expect(executionHistory.filteredEmptyPrompt).toBeVisible({
        timeout: POLL_TIMEOUT_MS,
      });
    });

    await test.step('clearing the search restores the full list', async () => {
      await executionHistory.searchRules('');

      await expect(executionHistory.ruleExecutionsTable).toContainText(otherRuleName, {
        timeout: POLL_TIMEOUT_MS,
      });
    });
  });
});
