/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { type CreateDatasetFormValues } from '../create_dataset_form_state';
import {
  EuiComboBoxWithCustomOption,
  type ComboBoxPresetOption,
} from './eui_combo_box_with_custom_option';

const ISO_8601_VALUE = 'ISO8601';
const ISO_8601_DISPLAY = 'ISO-8601';

const normalizeDatetimeFormat = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === ISO_8601_DISPLAY) return ISO_8601_VALUE;
  return trimmed;
};

const PRESET_OPTIONS: ComboBoxPresetOption[] = [
  {
    value: ISO_8601_VALUE,
    label: ISO_8601_DISPLAY,
    'data-test-subj': 'createDatasetSettingsDatetimeFormatOption-iso8601',
  },
  {
    value: 'strict_date_optional_time',
    label: 'strict_date_optional_time',
    'data-test-subj': 'createDatasetSettingsDatetimeFormatOption-strict_date_optional_time',
  },
  {
    value: 'yyyy-MM-dd',
    label: 'yyyy-MM-dd',
    'data-test-subj': 'createDatasetSettingsDatetimeFormatOption-yyyy-MM-dd',
  },
  {
    value: 'yyyy-MM-dd HH:mm:ss',
    label: 'yyyy-MM-dd HH:mm:ss',
    'data-test-subj': 'createDatasetSettingsDatetimeFormatOption-yyyy-MM-dd-HH-mm-ss',
  },
];

export function DatetimeFormatSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: datetimeFormatField } = useController({
    name: 'settings.datetime_format',
    control,
  });

  return (
    <EuiComboBoxWithCustomOption
      value={datetimeFormatField.value ?? ''}
      onChange={(next) => datetimeFormatField.onChange(normalizeDatetimeFormat(next))}
      onBlur={datetimeFormatField.onBlur}
      presetOptions={PRESET_OPTIONS}
      placeholder={createDatasetWizardStrings.settingsDatetimeFormatPlaceholder}
      data-test-subj="createDatasetSettingsDatetimeFormat"
      aria-label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
      isValidCustomOption={(searchValue) => Boolean(searchValue?.trim())}
    />
  );
}
