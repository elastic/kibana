/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export interface FilterBadgeOptions {
  field: string;
  value: string;
  enabled?: boolean;
  pinned?: boolean;
  negated?: boolean;
}

export const getFilterFieldKeyVariants = (field: string): string[] => {
  const variants = new Set<string>([field]);

  if (field.includes('.')) {
    variants.add(field.split('.')[0]);
  } else {
    variants.add(`${field}.keyword`);
  }

  return [...variants];
};

export const hasFilterBadge = async (
  page: ScoutPage,
  options: FilterBadgeOptions
): Promise<boolean> => {
  for (const field of getFilterFieldKeyVariants(options.field)) {
    const fieldOptions = { ...options, field };
    const selectors = [
      [
        '~filter',
        fieldOptions.enabled !== undefined &&
          `~filter-${fieldOptions.enabled ? 'enabled' : 'disabled'}`,
        fieldOptions.field && `~filter-key-${fieldOptions.field}`,
        fieldOptions.value && `~filter-value-${fieldOptions.value}`,
        fieldOptions.pinned !== undefined &&
          `~filter-${fieldOptions.pinned ? 'pinned' : 'unpinned'}`,
        fieldOptions.negated !== undefined && (fieldOptions.negated ? '~filter-negated' : ''),
      ],
      [
        '~filter',
        fieldOptions.field && `~filter-key-${fieldOptions.field}`,
        fieldOptions.value && `~filter-value-${fieldOptions.value}`,
      ],
    ]
      .map((parts) => parts.filter(Boolean).join(' & '))
      .filter(Boolean);

    for (const selector of selectors) {
      if ((await page.testSubj.locator(selector).count()) > 0) {
        return true;
      }
    }
  }

  return false;
};

export const resolveFilterFieldKey = async (page: ScoutPage, field: string): Promise<string> => {
  for (const key of getFilterFieldKeyVariants(field)) {
    const filterBadge = page.testSubj.locator(`~filter & ~filter-key-${key}`);
    if ((await filterBadge.count()) > 0) {
      return key;
    }
  }

  return field;
};

export const toggleFilterPinnedForField = async (
  page: ScoutPage,
  toggleFilterPinned: (field: string) => Promise<void>,
  field: string
) => {
  const resolvedField = await resolveFilterFieldKey(page, field);
  await toggleFilterPinned(resolvedField);
};

export const addFilterAllowExistingBadges = async (
  page: ScoutPage,
  options: {
    field: string;
    operator: 'is' | 'is not' | 'is one of' | 'is not one of' | 'exists' | 'does not exist';
    value: string;
  }
) => {
  await page.testSubj.click('addFilter');
  await page.testSubj.waitForSelector('addFilterPopover');
  await page.testSubj.typeWithDelay(
    'filterFieldSuggestionList > comboBoxSearchInput',
    options.field
  );
  await page.testSubj.click(`filterFieldOption-${options.field}`);
  await page.testSubj.typeWithDelay('filterOperatorList > comboBoxSearchInput', options.operator);
  await page.testSubj.click(`filterOperatorOption-${options.operator}`);

  const filterParamsInput = page.locator('[data-test-subj="filterParams"] input');
  await filterParamsInput.focus();
  await page.typeWithDelay('[data-test-subj="filterParams"] input', options.value);
  await page.testSubj.click('saveFilter');
  await page.testSubj.locator('addFilterPopover').waitFor({ state: 'hidden' });

  await expect
    .poll(async () => {
      for (const field of getFilterFieldKeyVariants(options.field)) {
        const filterBadge = page.testSubj.locator(
          `~filter & ~filter-key-${field} & ~filter-value-${options.value}`
        );
        if ((await filterBadge.count()) > 0) return true;
      }
      return false;
    })
    .toBe(true);
};

export const removeFirstPresentFilter = async (page: ScoutPage, fields: string[]) => {
  const fieldKeys = fields.flatMap((field) => getFilterFieldKeyVariants(field));

  for (const field of fieldKeys) {
    const filterBadge = page.testSubj.locator(`~filter & ~filter-key-${field}`);
    if ((await filterBadge.count()) === 0) {
      continue;
    }

    await expect(async () => {
      await filterBadge.click();
      const deleteFilterButton = page.testSubj.locator('deleteFilter');
      await expect(deleteFilterButton).toBeVisible();
      await deleteFilterButton.click();
      await expect(filterBadge).toHaveCount(0);
    }).toPass({ timeout: 15_000 });

    return;
  }
};
