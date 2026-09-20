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

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { DatasetErrorModeFormValue } from '../create_dataset_form_state';

const errorModeDropdownDisplay = ({
  title,
  description,
  isDefault,
  testSubj,
}: {
  title: string;
  description: string;
  isDefault: boolean;
  testSubj: string;
}) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="spaceBetween"
    gutterSize="m"
    css={{ width: '100%' }}
  >
    <EuiFlexItem grow={true}>
      <div data-test-subj={testSubj}>
        <EuiText size="s">
          <strong>{title}</strong>
        </EuiText>
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
      </div>
    </EuiFlexItem>
    {isDefault ? (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

const errorModeSelectedDisplay = ({ title, testSubj }: { title: string; testSubj: string }) => (
  <div data-test-subj={testSubj}>
    <EuiText size="s">{title}</EuiText>
  </div>
);

const ERROR_MODE_OPTIONS = [
  {
    value: 'fail_fast',
    inputDisplay: errorModeSelectedDisplay({
      title: createDatasetWizardStrings.settingsErrorModeFailFast,
      testSubj: 'createDatasetSettingsErrorModeInput-fail_fast',
    }),
    dropdownDisplay: errorModeDropdownDisplay({
      title: createDatasetWizardStrings.settingsErrorModeFailFast,
      description: createDatasetWizardStrings.settingsErrorModeFailFastDescription,
      isDefault: true,
      testSubj: 'createDatasetSettingsErrorModeDropdown-fail_fast',
    }),
    'data-test-subj': 'createDatasetSettingsErrorModeOption-fail_fast',
  },
  {
    value: 'skip_row',
    inputDisplay: errorModeSelectedDisplay({
      title: createDatasetWizardStrings.settingsErrorModeSkipRow,
      testSubj: 'createDatasetSettingsErrorModeInput-skip_row',
    }),
    dropdownDisplay: errorModeDropdownDisplay({
      title: createDatasetWizardStrings.settingsErrorModeSkipRow,
      description: createDatasetWizardStrings.settingsErrorModeSkipRowDescription,
      isDefault: false,
      testSubj: 'createDatasetSettingsErrorModeDropdown-skip_row',
    }),
    'data-test-subj': 'createDatasetSettingsErrorModeOption-skip_row',
  },
  {
    value: 'null_field',
    inputDisplay: errorModeSelectedDisplay({
      title: createDatasetWizardStrings.settingsErrorModeNullField,
      testSubj: 'createDatasetSettingsErrorModeInput-null_field',
    }),
    dropdownDisplay: errorModeDropdownDisplay({
      title: createDatasetWizardStrings.settingsErrorModeNullField,
      description: createDatasetWizardStrings.settingsErrorModeNullFieldDescription,
      isDefault: false,
      testSubj: 'createDatasetSettingsErrorModeDropdown-null_field',
    }),
    'data-test-subj': 'createDatasetSettingsErrorModeOption-null_field',
  },
] satisfies Array<EuiSuperSelectOption<DatasetErrorModeFormValue>>;

export function ErrorModeSelect({
  value,
  onChange,
  onBlur,
}: {
  value: DatasetErrorModeFormValue;
  onChange: (value: DatasetErrorModeFormValue) => void;
  onBlur: () => void;
}) {
  return (
    <EuiSuperSelect
      options={ERROR_MODE_OPTIONS}
      data-test-subj="createDatasetSettingsErrorMode"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsErrorModeLabel}
      valueOfSelected={value || undefined}
      onChange={(nextValue) => onChange(nextValue as DatasetErrorModeFormValue)}
      onBlur={onBlur}
      placeholder={createDatasetWizardStrings.settingsErrorModePlaceholder}
    />
  );
}
