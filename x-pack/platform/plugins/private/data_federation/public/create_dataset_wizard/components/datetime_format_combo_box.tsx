/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { DEFAULT_DATETIME_FORMAT } from '../create_dataset_form_state';
import {
  EuiComboBoxWithCustomOption,
  type ComboBoxPresetOption,
} from './eui_combo_box_with_custom_option';

export const DATETIME_FORMAT_PRESET_OPTIONS: readonly ComboBoxPresetOption[] = [
  {
    value: DEFAULT_DATETIME_FORMAT,
    label: DEFAULT_DATETIME_FORMAT,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd' },
  { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss' },
];

export function DatetimeFormatComboBox({
  value,
  onChange,
  onBlur,
  placeholder,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  fullWidth = true,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
  placeholder: string;
  'aria-label': string;
  'data-test-subj': string;
  fullWidth?: boolean;
}) {
  return (
    <EuiComboBoxWithCustomOption
      value={value}
      onChange={(next) => onChange(next.trim())}
      onBlur={onBlur}
      presetOptions={DATETIME_FORMAT_PRESET_OPTIONS}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      aria-label={ariaLabel}
      fullWidth={fullWidth}
      isValidCustomOption={(searchValue) => Boolean(searchValue?.trim())}
    />
  );
}
