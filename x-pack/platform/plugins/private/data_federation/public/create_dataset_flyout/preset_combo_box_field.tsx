/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import { DefaultOptionBadge } from './dataset_settings_super_select_utils';

export interface PresetComboBoxFieldProps {
  value: string;
  onChange: (nextValue: string) => void;
  label: ReactNode;
  helpText?: ReactNode;
  placeholder: string;
  presets: ReadonlyArray<{ value: string; label: string }>;
  'data-test-subj': string;
  isCompressed?: boolean;
  /** Marks the matching preset option with the default badge in the dropdown. */
  defaultPresetValue?: string;
}

const buildSelectedOptions = (
  value: string,
  comboBoxOptions: Array<EuiComboBoxOptionOption<string>>
): Array<EuiComboBoxOptionOption<string>> => {
  if (!value) {
    return [];
  }

  const matchingOption = comboBoxOptions.find((option) => option.value === value);

  return [{ label: matchingOption?.label ?? value, value }];
};

export const PresetComboBoxField: FunctionComponent<PresetComboBoxFieldProps> = ({
  value,
  onChange,
  label,
  helpText,
  placeholder,
  presets,
  'data-test-subj': dataTestSubj,
  isCompressed = true,
  defaultPresetValue,
}) => {
  const comboBoxOptions = useMemo(
    () =>
      presets.map((preset) => ({
        label: preset.label,
        value: preset.value,
        ...(preset.value === defaultPresetValue ? { append: <DefaultOptionBadge /> } : {}),
      })),
    [defaultPresetValue, presets]
  );

  const selectedOptions = useMemo(
    () => buildSelectedOptions(value, comboBoxOptions),
    [comboBoxOptions, value]
  );

  const handleSelectionChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(newSelectedOptions[0]?.value ?? '');
    },
    [onChange]
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
    <EuiFormRow label={label} helpText={helpText} fullWidth data-test-subj={dataTestSubj}>
      <EuiComboBox
        options={comboBoxOptions}
        selectedOptions={selectedOptions}
        onChange={handleSelectionChange}
        onCreateOption={handleCreateOption}
        data-test-subj={`${dataTestSubj}Input`}
        fullWidth
        compressed={isCompressed}
        isClearable
        aria-label={typeof label === 'string' ? label : undefined}
        placeholder={placeholder}
        singleSelection={{ asPlainText: true }}
        customOptionText={createDatasetFlyoutStrings.settingsPresetCustomOptionText()}
      />
    </EuiFormRow>
  );
};
