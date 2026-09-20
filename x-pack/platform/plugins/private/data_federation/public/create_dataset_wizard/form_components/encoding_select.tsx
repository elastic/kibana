/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { DEFAULT_ENCODING, type CreateDatasetFormValues } from '../create_dataset_form_state';

const ENCODING_PRESETS = ['UTF-8', 'UTF-16', 'ISO-8859-1', 'US-ASCII', 'windows-1252'] as const;

const presetOptions: Array<EuiComboBoxOptionOption<string>> = [
  { label: createDatasetWizardStrings.settingsEncodingUtf8 },
  { label: createDatasetWizardStrings.settingsEncodingUtf16 },
  { label: createDatasetWizardStrings.settingsEncodingIso88591 },
  { label: createDatasetWizardStrings.settingsEncodingUsAscii },
  { label: createDatasetWizardStrings.settingsEncodingWindows1252 },
].map((opt) => ({ ...opt, 'data-test-subj': `createDatasetSettingsEncodingOption-${opt.label}` }));

export function EncodingSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: encodingField } = useController({
    name: 'settings.encoding',
    control,
  });
  const [customOptions, setCustomOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const selectedEncoding = encodingField.value || DEFAULT_ENCODING;

  const options = useMemo(() => {
    const custom = [...customOptions];
    if (
      selectedEncoding &&
      !ENCODING_PRESETS.includes(selectedEncoding as (typeof ENCODING_PRESETS)[number]) &&
      !custom.some((o) => o.label === selectedEncoding)
    ) {
      custom.unshift({
        label: selectedEncoding,
        'data-test-subj': `createDatasetSettingsEncodingOption-${selectedEncoding}`,
      });
    }
    return [...presetOptions, ...custom];
  }, [customOptions, selectedEncoding]);

  return (
    <EuiComboBox
      options={options}
      singleSelection={{ asPlainText: true }}
      selectedOptions={[{ label: selectedEncoding }]}
      onChange={(selectedOptions) => {
        const next = selectedOptions?.[0]?.label;
        encodingField.onChange(next ?? DEFAULT_ENCODING);
      }}
      onCreateOption={(searchValue) => {
        const trimmed = searchValue.trim();
        if (!trimmed) return false;

        setCustomOptions((prev) => {
          if (prev.some((o) => o.label === trimmed)) return prev;
          return [
            ...prev,
            { label: trimmed, 'data-test-subj': `createDatasetSettingsEncodingOption-${trimmed}` },
          ];
        });
        encodingField.onChange(trimmed);
      }}
      onBlur={encodingField.onBlur}
      placeholder={createDatasetWizardStrings.settingsEncodingPlaceholder}
      data-test-subj="createDatasetSettingsEncoding"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsEncodingLabel}
    />
  );
}
