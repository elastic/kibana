/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { DEFAULT_ENCODING, type CreateDatasetFormValues } from '../create_dataset_form_state';

const CUSTOM_ENCODING_VALUE = 'custom';

const ENCODING_PRESETS = ['UTF-8', 'UTF-16', 'ISO-8859-1', 'US-ASCII', 'windows-1252'] as const;

type EncodingPreset = (typeof ENCODING_PRESETS)[number];

const isPresetEncoding = (value: string): value is EncodingPreset =>
  ENCODING_PRESETS.includes(value as EncodingPreset);

const encodingOption = (
  value: string,
  title: string,
  isDefault: boolean
): EuiSuperSelectOption<string> => ({
  value,
  inputDisplay: <EuiText size="s">{title}</EuiText>,
  dropdownDisplay: (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem grow={true}>
        <EuiText size="s">{title}</EuiText>
      </EuiFlexItem>
      {isDefault ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ),
  'data-test-subj': `createDatasetSettingsEncodingOption-${value}`,
});

const ENCODING_OPTIONS = [
  encodingOption('UTF-8', createDatasetWizardStrings.settingsEncodingUtf8, true),
  encodingOption('UTF-16', createDatasetWizardStrings.settingsEncodingUtf16, false),
  encodingOption('ISO-8859-1', createDatasetWizardStrings.settingsEncodingIso88591, false),
  encodingOption('US-ASCII', createDatasetWizardStrings.settingsEncodingUsAscii, false),
  encodingOption('windows-1252', createDatasetWizardStrings.settingsEncodingWindows1252, false),
  encodingOption(CUSTOM_ENCODING_VALUE, createDatasetWizardStrings.settingsEncodingCustom, false),
];

export function EncodingSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: encodingField } = useController({
    name: 'settings.encoding',
    control,
  });
  const [isCustom, setIsCustom] = useState(
    () => Boolean(encodingField.value) && !isPresetEncoding(encodingField.value)
  );
  const [customText, setCustomText] = useState(() =>
    encodingField.value && !isPresetEncoding(encodingField.value) ? encodingField.value : ''
  );

  const selected = isCustom
    ? CUSTOM_ENCODING_VALUE
    : isPresetEncoding(encodingField.value)
    ? encodingField.value
    : DEFAULT_ENCODING;

  return (
    <>
      <EuiSuperSelect
        options={ENCODING_OPTIONS}
        data-test-subj="createDatasetSettingsEncoding"
        fullWidth
        aria-label={createDatasetWizardStrings.settingsEncodingLabel}
        valueOfSelected={selected}
        onChange={(nextValue) => {
          if (nextValue === CUSTOM_ENCODING_VALUE) {
            setIsCustom(true);
            encodingField.onChange(customText);
            return;
          }
          setIsCustom(false);
          setCustomText('');
          encodingField.onChange(nextValue);
        }}
        onBlur={encodingField.onBlur}
        placeholder={createDatasetWizardStrings.settingsEncodingPlaceholder}
      />
      {isCustom ? (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow label={createDatasetWizardStrings.settingsEncodingCustomLabel} fullWidth>
            <EuiFieldText
              data-test-subj="createDatasetSettingsEncodingCustom"
              fullWidth
              placeholder={createDatasetWizardStrings.settingsEncodingCustomPlaceholder}
              value={customText}
              onChange={(e) => {
                const nextValue = e.target.value;
                setCustomText(nextValue);
                encodingField.onChange(nextValue);
              }}
              onBlur={encodingField.onBlur}
              name={encodingField.name}
              inputRef={encodingField.ref}
            />
          </EuiFormRow>
        </>
      ) : null}
    </>
  );
}
