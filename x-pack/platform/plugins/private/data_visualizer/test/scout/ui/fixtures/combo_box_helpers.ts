/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export const setComboBoxValue = async (
  page: ScoutPage,
  dataTestSubj: string,
  value: string,
  options?: { optionVisibilityTimeoutMs?: number }
) => {
  const comboBox = page.components.comboBox(dataTestSubj);
  const selected = await comboBox.getSelectedOptions();
  if (selected.includes(value)) {
    return;
  }

  await comboBox.setSelectedOptions(
    [value],
    options?.optionVisibilityTimeoutMs !== undefined
      ? { timeout: options.optionVisibilityTimeoutMs }
      : {}
  );
};
