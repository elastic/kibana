/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';

export const DefaultOptionBadge = () => (
  <EuiBadge color="hollow" data-test-subj="datasetSettingsDefaultOptionBadge">
    {createDatasetFlyoutStrings.settingsDefaultOptionBadge()}
  </EuiBadge>
);

export const buildSuperSelectOption = <T extends string>({
  value,
  label,
  description,
}: {
  value: T;
  label: string;
  description?: string;
}): EuiSuperSelectOption<T> => {
  if (!description) {
    return { value, inputDisplay: label, dropdownDisplay: label };
  }

  return {
    value,
    inputDisplay: label,
    dropdownDisplay: (
      <>
        <strong>{label}</strong>
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </>
    ),
  };
};
