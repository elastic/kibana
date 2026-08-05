/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { Control, FieldPath, RegisterOptions } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';

export interface SettingsPresetComboBoxProps {
  control: Control<CreateDatasetFormValues>;
  name: FieldPath<CreateDatasetFormValues>;
  label: string;
  helpText?: string;
  placeholder: string;
  presets: Array<{ value: string; label: string; description?: string }>;
  'data-test-subj': string;
  rules?: RegisterOptions<CreateDatasetFormValues, FieldPath<CreateDatasetFormValues>>;
}

const buildSelectedOptions = (
  value: string,
  comboBoxOptions: Array<EuiComboBoxOptionOption<string>>
): Array<EuiComboBoxOptionOption<string>> => {
  if (!value) {
    return [];
  }

  const matchingOption = comboBoxOptions.find((option) => option.value === value);
  if (matchingOption) {
    return [matchingOption];
  }

  return [{ label: value, value }];
};

export const SettingsPresetComboBox: FunctionComponent<SettingsPresetComboBoxProps> = ({
  control,
  name,
  label,
  helpText,
  placeholder,
  presets,
  'data-test-subj': dataTestSubj,
  rules,
}) => {
  const { field, fieldState } = useController({ name, control, rules });

  const comboBoxOptions = useMemo(
    () =>
      presets.map((preset) => ({
        label: preset.label,
        value: preset.value,
      })),
    [presets]
  );

  const selectedOptions = useMemo(
    () => buildSelectedOptions(field.value, comboBoxOptions),
    [comboBoxOptions, field.value]
  );

  const handleSelectionChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      field.onChange(newSelectedOptions[0]?.value ?? '');
    },
    [field]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedValue = searchValue.trim();
      if (normalizedValue) {
        handleSelectionChange([{ label: normalizedValue, value: normalizedValue }]);
      }
    },
    [handleSelectionChange]
  );

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      fullWidth
      isInvalid={Boolean(fieldState.error)}
      error={fieldState.error?.message}
    >
      <EuiComboBox
        options={comboBoxOptions}
        selectedOptions={selectedOptions}
        onChange={handleSelectionChange}
        onCreateOption={handleCreateOption}
        data-test-subj={dataTestSubj}
        fullWidth
        compressed
        isClearable
        isInvalid={Boolean(fieldState.error)}
        aria-label={label}
        placeholder={placeholder}
        singleSelection={{ asPlainText: true }}
        customOptionText={createDatasetFlyoutStrings.settingsPresetCustomOptionText()}
        inputRef={field.ref}
      />
    </EuiFormRow>
  );
};
