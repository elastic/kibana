/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetErrorModeFormValue } from '../../../create_dataset_form_state';
import type { ComboBoxChange } from '../../../components/combo_box_selection_validity';
import {
  EuiComboBoxNoCustomOption,
  type EuiComboBoxNoCustomOptionOption,
} from '../../../components/eui_combo_box_no_custom_option';

const ERROR_MODE_OPTIONS: Array<
  EuiComboBoxNoCustomOptionOption<Exclude<DatasetErrorModeFormValue, ''>>
> = [
  {
    value: 'fail_fast',
    label: createDatasetWizardStrings.settingsErrorModeFailFast,
    description: createDatasetWizardStrings.settingsErrorModeFailFastDescription,
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
  onChange: (next: ComboBoxChange<DatasetErrorModeFormValue>) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  return (
    <EuiComboBoxNoCustomOption
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={ERROR_MODE_OPTIONS}
      defaultValue="fail_fast"
      isInvalid={isInvalid}
      placeholder={createDatasetWizardStrings.settingsErrorModePlaceholder}
      aria-label={createDatasetWizardStrings.settingsErrorModeLabel}
      data-test-subj="createDatasetSettingsErrorMode"
    />
  );
}
