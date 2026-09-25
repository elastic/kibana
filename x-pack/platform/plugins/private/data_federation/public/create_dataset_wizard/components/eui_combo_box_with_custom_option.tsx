/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

export interface ComboBoxPresetOption {
  value: string;
  label: string;
  'data-test-subj'?: string;
  append?: React.ReactNode;
}

type ComboBoxOption = EuiComboBoxOptionOption<string> & {
  value: string;
  'data-test-subj'?: string;
};

export function EuiComboBoxWithCustomOption({
  value,
  onChange,
  onBlur,
  presetOptions,
  placeholder,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  fullWidth = true,
  getCustomLabel = (customValue) => customValue,
  isValidCustomOption = (searchValue) => Boolean(searchValue?.trim()),
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
  presetOptions: readonly ComboBoxPresetOption[];
  placeholder?: string;
  'aria-label': string;
  'data-test-subj': string;
  fullWidth?: boolean;
  /** Convert a custom value into a display label. */
  getCustomLabel?: (customValue: string) => string;
  /** Validate the raw search value passed to onCreateOption. */
  isValidCustomOption?: (searchValue: string) => boolean;
}) {
  const presetValues = useMemo(() => new Set(presetOptions.map((o) => o.value)), [presetOptions]);

  const selectedValue = value ?? '';
  const isPreset = selectedValue ? presetValues.has(selectedValue) : false;

  const options = useMemo((): ComboBoxOption[] => {
    const base = presetOptions as ComboBoxOption[];
    if (!selectedValue || isPreset) {
      return base;
    }

    return [
      ...base,
      {
        value: selectedValue,
        label: getCustomLabel(selectedValue),
        'data-test-subj': `${dataTestSubj}Option-custom-${encodeURIComponent(selectedValue)}`,
      },
    ];
  }, [dataTestSubj, getCustomLabel, isPreset, presetOptions, selectedValue]);

  const selectedOption = useMemo((): ComboBoxOption[] => {
    if (!selectedValue) return [];
    const preset = presetOptions.find((o) => o.value === selectedValue);
    return [
      {
        value: selectedValue,
        label: preset?.label ?? getCustomLabel(selectedValue),
        append: preset?.append,
      },
    ];
  }, [getCustomLabel, presetOptions, selectedValue]);

  return (
    <EuiComboBox
      options={options}
      singleSelection={{ asPlainText: true }}
      selectedOptions={selectedOption}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as ComboBoxOption | undefined;
        onChange(next?.value ?? '');
      }}
      onCreateOption={(searchValue) => {
        if (!isValidCustomOption(searchValue)) return false;
        onChange(searchValue);
      }}
      onBlur={onBlur}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
    />
  );
}
