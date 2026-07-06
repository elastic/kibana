/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxWrapper } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactText = (value: string) => new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`);

export const setComboBoxValue = async (
  page: ScoutPage,
  dataTestSubj: string,
  value: string,
  options?: { optionVisibilityTimeoutMs?: number }
) => {
  const comboBox = new EuiComboBoxWrapper(page, { dataTestSubj });
  const wrapper = page.testSubj.locator(dataTestSubj);

  const selectedValue = await comboBox.getSelectedValue();
  if (selectedValue === value) {
    return;
  }

  const pills = await comboBox.getSelectedMultiOptions();
  if (pills.includes(value)) {
    return;
  }

  const clearButton = wrapper.locator('[data-test-subj="comboBoxClearButton"]');
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await page.keyboard.press('Escape');
  }

  await wrapper.locator('[data-test-subj="comboBoxInput"]').click();
  await wrapper.locator('[data-test-subj="comboBoxSearchInput"]').fill(value);

  const optionLocator = page
    .getByRole('option', { name: value, exact: false })
    .or(page.locator('.euiFilterSelectItem', { hasText: exactText(value) }));

  const optionCount = await optionLocator.count();
  if (optionCount > 0) {
    await optionLocator.click();
  } else {
    await wrapper.locator('[data-test-subj="comboBoxSearchInput"]').press('Enter');
  }

  await expect
    .poll(
      async () => {
        const currentValue = await comboBox.getSelectedValue();
        if (currentValue === value) {
          return true;
        }
        const currentPills = await comboBox.getSelectedMultiOptions();
        return currentPills.includes(value);
      },
      options?.optionVisibilityTimeoutMs !== undefined
        ? { timeout: options.optionVisibilityTimeoutMs }
        : {}
    )
    .toBe(true);
};
