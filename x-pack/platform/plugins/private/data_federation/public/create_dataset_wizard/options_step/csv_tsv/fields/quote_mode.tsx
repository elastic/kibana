/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetModeFormValue } from '../../../create_dataset_form_state';
import type { ComboBoxChange } from '../../../components/combo_box_selection_validity';
import {
  EuiComboBoxNoCustomOption,
  type EuiComboBoxNoCustomOptionOption,
} from '../../../components/eui_combo_box_no_custom_option';

const OPTIONS: Array<EuiComboBoxNoCustomOptionOption<Exclude<DatasetModeFormValue, ''>>> = [
  {
    value: 'quoted',
    label: createDatasetWizardStrings.settingsModeQuoted,
    description: createDatasetWizardStrings.settingsModeQuotedDescription,
    'data-test-subj': 'createDatasetSettingsModeOption-quoted',
  },
  {
    value: 'escaped',
    label: createDatasetWizardStrings.settingsModeEscaped,
    description: createDatasetWizardStrings.settingsModeEscapedDescription,
    'data-test-subj': 'createDatasetSettingsModeOption-escaped',
  },
  {
    value: 'plain',
    label: createDatasetWizardStrings.settingsModePlain,
    description: createDatasetWizardStrings.settingsModePlainDescription,
    'data-test-subj': 'createDatasetSettingsModeOption-plain',
  },
];

export const getQuoteModeDisplayLabel = (value: string): string =>
  OPTIONS.find((option) => option.value === value)?.label ?? value;

export function QuoteMode({
  value,
  onChange,
  onBlur,
  isInvalid,
  defaultValue,
}: {
  value: DatasetModeFormValue;
  onChange: (next: ComboBoxChange<DatasetModeFormValue>) => void;
  onBlur: () => void;
  isInvalid: boolean;
  /** Format-specific default: quoted for CSV, plain for TSV. */
  defaultValue?: DatasetModeFormValue;
}) {
  return (
    <EuiComboBoxNoCustomOption
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={OPTIONS}
      defaultValue={defaultValue}
      isInvalid={isInvalid}
      placeholder={createDatasetWizardStrings.settingsModePlaceholder}
      aria-label={createDatasetWizardStrings.settingsModeLabel}
      data-test-subj="createDatasetSettingsMode"
    />
  );
}
