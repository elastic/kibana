/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetBooleanFormValue } from '../../../create_dataset_form_state';
import type { ComboBoxChange } from '../../../components/combo_box_selection_validity';
import {
  EuiComboBoxNoCustomOption,
  type EuiComboBoxNoCustomOptionOption,
} from '../../../components/eui_combo_box_no_custom_option';

const OPTIONS: Array<EuiComboBoxNoCustomOptionOption<Exclude<DatasetBooleanFormValue, ''>>> = [
  {
    value: 'true',
    label: createDatasetWizardStrings.trueLabel,
    description: createDatasetWizardStrings.settingsHeaderRowTrueDescription,
    'data-test-subj': 'createDatasetSettingsHeaderRowOption-true',
  },
  {
    value: 'false',
    label: createDatasetWizardStrings.falseLabel,
    description: createDatasetWizardStrings.settingsHeaderRowFalseDescription,
    'data-test-subj': 'createDatasetSettingsHeaderRowOption-false',
  },
];

export function HeaderRow({
  value,
  onChange,
  onBlur,
  isInvalid,
}: {
  value: DatasetBooleanFormValue;
  onChange: (next: ComboBoxChange<DatasetBooleanFormValue>) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  return (
    <EuiComboBoxNoCustomOption
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={OPTIONS}
      defaultValue="true"
      isInvalid={isInvalid}
      placeholder={createDatasetWizardStrings.settingsHeaderRowPlaceholder}
      aria-label={createDatasetWizardStrings.settingsHeaderRowLabel}
      data-test-subj="createDatasetSettingsHeaderRow"
    />
  );
}
