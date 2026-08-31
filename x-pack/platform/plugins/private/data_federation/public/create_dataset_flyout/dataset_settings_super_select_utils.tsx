/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
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
  isDefault = false,
}: {
  value: T;
  label: string;
  description?: string;
  isDefault?: boolean;
}): EuiSuperSelectOption<T> => {
  if (!description && !isDefault) {
    return { value, inputDisplay: label, dropdownDisplay: label };
  }

  return {
    value,
    inputDisplay: label,
    dropdownDisplay: (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <strong>{label}</strong>
          </EuiFlexItem>
          {isDefault ? (
            <EuiFlexItem grow={false}>
              <DefaultOptionBadge />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {description ? (
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        ) : null}
      </>
    ),
  };
};
