/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiText,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type {
  CreateDatasetFormValues,
  DatasetBooleanFormValue,
} from '../create_dataset_form_state';

const OPTIMIZED_READER_OPTIONS = [
  {
    value: 'true',
    inputDisplay: <EuiText size="s">{createDatasetWizardStrings.enabledLabel}</EuiText>,
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={true}>
          <EuiText size="s">{createDatasetWizardStrings.enabledLabel}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': 'createDatasetSettingsOptimizedReaderOption-true',
  },
  {
    value: 'false',
    inputDisplay: <EuiText size="s">{createDatasetWizardStrings.disabledLabel}</EuiText>,
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={true}>
          <EuiText size="s">{createDatasetWizardStrings.disabledLabel}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': 'createDatasetSettingsOptimizedReaderOption-false',
  },
] satisfies Array<EuiSuperSelectOption<DatasetBooleanFormValue>>;

export function OptimizedReaderSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: optimizedReaderField } = useController({
    name: 'settings.optimized_reader',
    control,
  });

  return (
    <EuiSuperSelect
      options={OPTIMIZED_READER_OPTIONS}
      data-test-subj="createDatasetSettingsOptimizedReader"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsOptimizedReaderLabel}
      valueOfSelected={optimizedReaderField.value || undefined}
      onChange={(value) => optimizedReaderField.onChange(value)}
      onBlur={optimizedReaderField.onBlur}
      placeholder={createDatasetWizardStrings.settingsOptimizedReaderPlaceholder}
    />
  );
}
