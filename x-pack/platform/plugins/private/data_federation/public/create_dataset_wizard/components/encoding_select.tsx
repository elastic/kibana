/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { type CreateDatasetFormValues } from '../create_dataset_form_state';
import { EuiComboBoxWithCustomOption } from './eui_combo_box_with_custom_option';

const presetOptions = [
  {
    value: 'UTF-8',
    label: createDatasetWizardStrings.settingsEncodingUtf8,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
  { value: 'UTF-16', label: createDatasetWizardStrings.settingsEncodingUtf16 },
  { value: 'ISO-8859-1', label: createDatasetWizardStrings.settingsEncodingIso88591 },
  { value: 'US-ASCII', label: createDatasetWizardStrings.settingsEncodingUsAscii },
  { value: 'windows-1252', label: createDatasetWizardStrings.settingsEncodingWindows1252 },
].map((opt) => ({
  ...opt,
  'data-test-subj': `createDatasetSettingsEncodingOption-${opt.value}`,
}));

export function EncodingSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: encodingField } = useController({
    name: 'settings.encoding',
    control,
  });

  const selectedEncoding = encodingField.value ?? '';

  return (
    <EuiComboBoxWithCustomOption
      value={selectedEncoding}
      onChange={(next) => {
        const trimmed = next.trim();
        encodingField.onChange(trimmed);
      }}
      onBlur={encodingField.onBlur}
      presetOptions={presetOptions}
      placeholder={createDatasetWizardStrings.settingsEncodingPlaceholder}
      data-test-subj="createDatasetSettingsEncoding"
      aria-label={createDatasetWizardStrings.settingsEncodingLabel}
      isValidCustomOption={(searchValue) => Boolean(searchValue?.trim())}
    />
  );
}
