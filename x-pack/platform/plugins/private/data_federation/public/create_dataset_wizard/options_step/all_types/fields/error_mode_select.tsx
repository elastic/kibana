/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetErrorModeFormValue } from '../../../create_dataset_form_state';
import { DescribedOptionDisplay } from '../../../components/described_option_display';

type ErrorModeOption = EuiComboBoxOptionOption<DatasetErrorModeFormValue> & {
  value: DatasetErrorModeFormValue;
  description: string;
  'data-test-subj': string;
};

export interface ErrorModeChange {
  value: DatasetErrorModeFormValue;
  /** False while the input holds typed text that has not been resolved to an option. */
  isValid: boolean;
}

const renderErrorModeOption = (option: EuiComboBoxOptionOption<DatasetErrorModeFormValue>) => {
  const opt = option as ErrorModeOption;
  return <DescribedOptionDisplay title={opt.label} description={opt.description} />;
};

const ERROR_MODE_OPTIONS: ErrorModeOption[] = [
  {
    value: 'fail_fast',
    label: createDatasetWizardStrings.settingsErrorModeFailFast,
    description: createDatasetWizardStrings.settingsErrorModeFailFastDescription,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
    'data-test-subj': 'createDatasetSettingsErrorModeOption-fail_fast',
  },
  {
    value: 'skip_row',
    label: createDatasetWizardStrings.settingsErrorModeSkipRow,
    description: createDatasetWizardStrings.settingsErrorModeSkipRowDescription,
    'data-test-subj': 'createDatasetSettingsErrorModeOption-skip_row',
  },
  {
    value: 'null_field',
    label: createDatasetWizardStrings.settingsErrorModeNullField,
    description: createDatasetWizardStrings.settingsErrorModeNullFieldDescription,
    'data-test-subj': 'createDatasetSettingsErrorModeOption-null_field',
  },
];

export function ErrorModeSelect({
  value,
  onChange,
  onBlur,
  isInvalid,
}: {
  value: DatasetErrorModeFormValue;
  onChange: (next: ErrorModeChange) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  // EuiComboBox clears its search text right after reporting a selection, before the new `value` prop
  // arrives; the search handler reads this ref so that report cannot revert the selection.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const selectedOption = ERROR_MODE_OPTIONS.find((o) => o.value === value);
  return (
    <EuiComboBox
      placeholder={createDatasetWizardStrings.settingsErrorModePlaceholder}
      options={ERROR_MODE_OPTIONS}
      data-test-subj="createDatasetSettingsErrorMode"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsErrorModeLabel}
      singleSelection={{ asPlainText: true }}
      isClearable
      rowHeight="auto"
      renderOption={renderErrorModeOption}
      selectedOptions={
        selectedOption
          ? [
              {
                value: selectedOption.value,
                label: selectedOption.label,
              },
            ]
          : []
      }
      isInvalid={isInvalid}
      onSearchChange={(searchValue) => {
        onChange({ value: latestValue.current, isValid: !searchValue });
      }}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as ErrorModeOption | undefined;
        latestValue.current = next?.value ?? '';
        onChange({ value: latestValue.current, isValid: true });
      }}
      onBlur={onBlur}
    />
  );
}
