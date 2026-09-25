/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { DatasetErrorModeFormValue } from '../create_dataset_form_state';

type ErrorModeOption = EuiComboBoxOptionOption<DatasetErrorModeFormValue> & {
  value: DatasetErrorModeFormValue;
};

const ERROR_MODE_OPTIONS: ErrorModeOption[] = [
  {
    value: 'fail_fast',
    label: createDatasetWizardStrings.settingsErrorModeFailFast,
    toolTipContent: createDatasetWizardStrings.settingsErrorModeFailFastDescription,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
  {
    value: 'skip_row',
    label: createDatasetWizardStrings.settingsErrorModeSkipRow,
    toolTipContent: createDatasetWizardStrings.settingsErrorModeSkipRowDescription,
  },
  {
    value: 'null_field',
    label: createDatasetWizardStrings.settingsErrorModeNullField,
    toolTipContent: createDatasetWizardStrings.settingsErrorModeNullFieldDescription,
  },
] as const;

export function ErrorModeSelect({
  value,
  onChange,
  onBlur,
}: {
  value: DatasetErrorModeFormValue;
  onChange: (value: DatasetErrorModeFormValue) => void;
  onBlur: () => void;
}) {
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
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as ErrorModeOption | undefined;
        onChange(next?.value ?? '');
      }}
      onBlur={onBlur}
    />
  );
}
