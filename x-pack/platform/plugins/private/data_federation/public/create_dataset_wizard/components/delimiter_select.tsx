/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  EuiComboBoxWithCustomOption,
  type ComboBoxPresetOption,
} from './eui_combo_box_with_custom_option';

const toDisplayLabel = (value: string): string => {
  if (value === ',') return createDatasetWizardStrings.settingsDelimiterOptionComma;
  if (value === '\t') return createDatasetWizardStrings.settingsDelimiterOptionTab;
  if (value === ';') return createDatasetWizardStrings.settingsDelimiterOptionSemicolon;
  if (value === '|') return createDatasetWizardStrings.settingsDelimiterOptionPipe;
  return value;
};

const PRESET_OPTIONS: ComboBoxPresetOption[] = [
  {
    value: ',',
    label: createDatasetWizardStrings.settingsDelimiterOptionComma,
    'data-test-subj': 'createDatasetSettingsDelimiterOption-comma',
  },
  {
    value: '\t',
    label: createDatasetWizardStrings.settingsDelimiterOptionTab,
    'data-test-subj': 'createDatasetSettingsDelimiterOption-tab',
  },
  {
    value: ';',
    label: createDatasetWizardStrings.settingsDelimiterOptionSemicolon,
    'data-test-subj': 'createDatasetSettingsDelimiterOption-semicolon',
  },
  {
    value: '|',
    label: createDatasetWizardStrings.settingsDelimiterOptionPipe,
    'data-test-subj': 'createDatasetSettingsDelimiterOption-pipe',
  },
];

export function DelimiterSelect({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
}) {
  const selectedValue = value ?? '';

  return (
    <EuiComboBoxWithCustomOption
      value={selectedValue}
      onChange={onChange}
      onBlur={onBlur}
      presetOptions={PRESET_OPTIONS}
      getCustomLabel={toDisplayLabel}
      // Don't trim: allow whitespace delimiters (e.g. a single space).
      isValidCustomOption={(searchValue) => Boolean(searchValue) && searchValue.length === 1}
      placeholder={createDatasetWizardStrings.settingsDelimiterPlaceholder}
      data-test-subj="createDatasetSettingsDelimiter"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsDelimiterLabel}
    />
  );
}
