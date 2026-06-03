/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Fills the mandatory fields of the .index-threshold rule form so the rule can
 * be saved without validation errors.  Used in create-rule-flow tests.
 *
 * Opens the index popover, picks the first index option after typing '.kibana',
 * waits for the time-field <select> to populate, and selects the first real
 * date field.
 */
export const fillIndexThresholdForm = async (page: ScoutPage, name: string) => {
  await page.testSubj.locator('ruleDetailsNameInput').fill(name);

  await page.testSubj.click('selectIndexExpression');

  // Type to trigger the debounced index search (250 ms debounce).
  const comboInput = page.testSubj.locator('thresholdIndexesComboBox').locator('input');
  await comboInput.fill('.kibana');

  // Wait for the listbox to appear; even if no real indices match, the "Choose…"
  // fallback group always renders the typed pattern as a selectable option.
  const listbox = page.locator('[role="listbox"]');
  await listbox.waitFor({ state: 'visible', timeout: 15_000 });
  await listbox.locator('[role="option"]:first-child').click();

  // After index selection the form calls getFieldsForWildcard async.
  // Wait for at least one real time-field option to appear (index 0 is the
  // "Select a field" placeholder, index 1 is the first real date field).
  const timeFieldSelect = page.testSubj.locator('thresholdAlertTimeFieldSelect');
  await expect(timeFieldSelect.locator('option:nth-child(2)')).toBeAttached({ timeout: 15_000 });

  const firstFieldValue = await timeFieldSelect
    .locator('option:nth-child(2)')
    .getAttribute('value');
  await timeFieldSelect.selectOption(firstFieldValue!);

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

export const makeIndexThresholdRule = (namePrefix: string) => ({
  name: `${namePrefix}-rule-${Date.now()}`,
  ruleTypeId: '.index-threshold',
  consumer: 'alerts',
  enabled: true,
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
