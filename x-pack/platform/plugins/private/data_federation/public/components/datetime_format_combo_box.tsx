/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiComboBoxWithCustomOption,
  type ComboBoxPresetOption,
} from '../create_dataset_wizard/components/eui_combo_box_with_custom_option';

const ISO_8601_VALUE = 'ISO8601';
const ISO_8601_DISPLAY = 'ISO-8601';

export const normalizeDatetimeFormat = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === ISO_8601_DISPLAY) return ISO_8601_VALUE;
  return trimmed;
};

export const DATETIME_FORMAT_PRESET_OPTIONS: readonly ComboBoxPresetOption[] = [
  { value: ISO_8601_VALUE, label: ISO_8601_DISPLAY },
  { value: 'strict_date_optional_time', label: 'strict_date_optional_time' },
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
      onChange={(next) => onChange(normalizeDatetimeFormat(next))}
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
