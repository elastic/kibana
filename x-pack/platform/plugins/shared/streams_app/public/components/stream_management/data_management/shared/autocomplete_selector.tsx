/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';

export interface Suggestion {
  name: string;
  type?: string;
  icon?: boolean;
}

export interface AutocompleteSelectorProps {
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
  suggestions?: Suggestion[];
  autoFocus?: boolean;
  hideSuggestions?: boolean;
  labelAppend?: React.ReactNode;
  showIcon?: boolean;
  prepend?: EuiComboBoxProps<string>['prepend'];
}

/**
 * Generalized field selector component with autocomplete suggestions
 */
export const AutocompleteSelector = ({
  value,
  onChange,
  label,
  helpText,
  placeholder,
  disabled = false,
  compressed = false,
  fullWidth = false,
  dataTestSubj = 'streamsAppAutocompleteSelector',
  isInvalid,
  error,
  suggestions = [],
  autoFocus,
  hideSuggestions = false,
  labelAppend,
  showIcon = false,
  prepend,
}: AutocompleteSelectorProps) => {
  const comboBoxOptions = useMemo(
    () =>
      suggestions.map((suggestion) => ({
        label: suggestion.name,
        value: suggestion.name,
        ...(showIcon &&
          suggestion.icon && {
            prepend: (
              <FieldIcon type={suggestion.type || 'unknown'} size="s" className="eui-alignMiddle" />
            ),
          }),
        'data-test-subj': `autocomplete-suggestion-${suggestion.name}`,
      })),
    [suggestions, showIcon]
  );

  const selectedOptions = useMemo(() => {
    if (!value) return [];

    const matchingOption = comboBoxOptions.find((option) => option.value === value);
    if (matchingOption) {
      // Return the option but without the prepend (icon)
      return [
        {
          label: matchingOption.label,
          value: matchingOption.value,
          'data-test-subj': matchingOption['data-test-subj'],
        },
      ];
    }

    return [
      {
        label: value,
        value,
      },
    ];
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

  const defaultPlaceholder = i18n.translate(
    'xpack.streams.autocompleteSelector.defaultPlaceholder',
    {
      defaultMessage: 'Select or type...',
    }
  );

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
          compressed={true}
          isClearable
          fullWidth={fullWidth}
          customOptionText={i18n.translate('xpack.streams.fieldSelector.customOptionText', {
            defaultMessage: 'Add {searchValue} as a custom field',
            values: { searchValue: '{searchValue}' },
          })}
          autoFocus={autoFocus}
          noSuggestions={hideSuggestions}
          prepend={prepend}
        />
      </EuiFormRow>
    </>
  );
};
