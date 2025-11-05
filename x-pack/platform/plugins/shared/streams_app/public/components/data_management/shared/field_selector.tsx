/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';

export interface FieldSuggestion {
  name: string;
  type?: string;
}

export interface FieldSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  compressed?: boolean;
  fullWidth?: boolean;
  dataTestSubj?: string;
  isInvalid?: boolean;
  error?: string;
  suggestions?: FieldSuggestion[];
  autoFocus?: boolean;
  labelAppend?: React.ReactNode;
}

/**
 * Generalized field selector component with autocomplete suggestions
 */
export const FieldSelector = ({
  value,
  onChange,
  label,
  helpText,
  placeholder,
  disabled = false,
  compressed = false,
  fullWidth = false,
  dataTestSubj = 'streamsAppFieldSelector',
  isInvalid,
  error,
  suggestions = [],
  autoFocus,
  labelAppend,
}: FieldSelectorProps) => {
  const comboBoxOptions = useMemo(
    () =>
      suggestions.map((suggestion) => ({
        label: suggestion.name,
        value: suggestion.name,
        'data-test-subj': `field-suggestion-${suggestion.name}`,
      })),
    [suggestions]
  );

  const selectedOptions = useMemo(() => {
    if (!value) return [];

    const matchingSuggestion = comboBoxOptions.find((option) => option.value === value);
    return matchingSuggestion ? [matchingSuggestion] : [{ label: value, value }];
  }, [value, comboBoxOptions]);

  const handleSelectionChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const selectedOption = newSelectedOptions[0];
      const newFieldValue = selectedOption?.value || '';
      onChange?.(newFieldValue);
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

  const defaultPlaceholder = i18n.translate('xpack.streams.fieldSelector.defaultPlaceholder', {
    defaultMessage: 'Select or type a field name...',
  });

  return (
    <>
      <EuiFormRow
        label={label}
        helpText={helpText}
        isInvalid={isInvalid}
        error={error}
        fullWidth={fullWidth}
        labelAppend={labelAppend}
      >
        <EuiComboBox
          data-test-subj={dataTestSubj}
          placeholder={placeholder ?? defaultPlaceholder}
          options={comboBoxOptions}
          selectedOptions={selectedOptions}
          onChange={handleSelectionChange}
          onCreateOption={handleCreateOption}
          singleSelection={{ asPlainText: true }}
          isInvalid={isInvalid}
          isDisabled={disabled}
          compressed={compressed}
          isClearable
          fullWidth={fullWidth}
          customOptionText={i18n.translate('xpack.streams.fieldSelector.customOptionText', {
            defaultMessage: 'Add {searchValue} as a custom field',
            values: { searchValue: '{searchValue}' },
          })}
          autoFocus={autoFocus}
        />
      </EuiFormRow>
    </>
  );
};
