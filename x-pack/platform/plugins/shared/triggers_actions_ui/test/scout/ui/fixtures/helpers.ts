/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

// Fills the index-threshold rule form to a state where save is enabled:
// name + index (first available .k* index) + time field (first non-placeholder option).
// Used in both rules_create_flow.spec.ts and connector_slack.spec.ts.
export const defineIndexThresholdRule = async (page: ScoutPage, name: string) => {
  await page.testSubj.click('createRuleButton');
  await page.testSubj.locator('ruleTypeModal').waitFor({ state: 'visible' });
  await page.testSubj.click('.index-threshold-SelectOption');
  await page.testSubj.locator('ruleForm').waitFor({ state: 'visible' });

  await page.testSubj.locator('ruleDetailsNameInput').fill(name);

  await page.testSubj.click('selectIndexExpression');
  const indexCombo = page.testSubj.locator('thresholdIndexesComboBox');
  await indexCombo.click();
  await page.keyboard.type('.k');
  const firstIndexOption = page.locator('[role="listbox"] [role="option"]:nth-of-type(1)');
  await firstIndexOption.waitFor({ state: 'visible' });
  await firstIndexOption.click();

  const timeFieldSelect = page.testSubj.locator('thresholdAlertTimeFieldSelect');
  await timeFieldSelect.waitFor({ state: 'visible' });
  const firstOptionValue = await timeFieldSelect
    .locator('option:nth-child(2)')
    .getAttribute('value');
  if (!firstOptionValue) {
    throw new Error('No time-field options available on thresholdAlertTimeFieldSelect');
  }
  await timeFieldSelect.selectOption(firstOptionValue);

  await page.testSubj.click('closePopover');
};

export const makeEsQueryRule = (namePrefix: string) => ({
  name: `${namePrefix}-rule-${Date.now()}`,
  ruleTypeId: '.es-query',
  consumer: 'stackAlerts',
  params: {
    searchType: 'esQuery' as const,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [0],
    thresholdComparator: '>',
    size: 100,
    esQuery: '{"query":{"match_all":{}}}',
    aggType: 'count',
    groupBy: 'all',
    termSize: 5,
    excludeHitsFromPreviousRun: false,
    sourceFields: [],
    index: ['.kibana'],
    timeField: '@timestamp',
  },
  schedule: { interval: '1m' },
  tags: [namePrefix],
});
