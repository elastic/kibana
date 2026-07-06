/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export interface FilterBadgeOptions {
  field: string;
  value: string;
  enabled?: boolean;
  pinned?: boolean;
  negated?: boolean;
}

export const hasFilterBadge = async (
  page: ScoutPage,
  options: FilterBadgeOptions
): Promise<boolean> => {
  const fieldVariants = [options.field];
  if (options.field.includes('.')) {
    fieldVariants.push(options.field.split('.')[0]);
  }

  for (const field of fieldVariants) {
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

export const removeFirstPresentFilter = async (page: ScoutPage, fields: string[]) => {
  for (const field of fields) {
    const filterBadge = page.testSubj.locator(`~filter & ~filter-key-${field}`);
    if ((await filterBadge.count()) === 0) {
      continue;
    }
    await filterBadge.click();
    await page.testSubj.click('deleteFilter');
    return;
  }
};
