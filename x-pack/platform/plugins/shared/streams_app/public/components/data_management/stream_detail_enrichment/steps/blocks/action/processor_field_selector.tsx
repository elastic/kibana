/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useFieldSuggestions } from './hooks/use_field_suggestions';
import type { FieldSuggestion } from './utils/field_suggestions';

export interface ProcessorFieldSelectorProps {
  fieldKey?: string;
  helpText?: string;
  processorType?: string;
  placeholder?: string;
  label?: string;
  onChange?: (value: string) => void;
}

export const ProcessorFieldSelector = ({
  fieldKey = 'from',
  helpText,
  processorType,
  placeholder,
  label,
  onChange,
}: ProcessorFieldSelectorProps) => {
  const { field, fieldState } = useController({
    name: fieldKey,
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorRequiredError',
        { defaultMessage: 'A field value is required.' }
      ),
    },
  });

  const suggestions = useFieldSuggestions(processorType);

  const selectedOptions = useMemo(() => {
    if (!field.value) return [];

    const matchingSuggestion = suggestions.find((s) => s.value?.name === field.value);
    return matchingSuggestion
      ? [matchingSuggestion]
      : [{ label: field.value, value: { name: field.value } }];
  }, [field.value, suggestions]);

  const handleSelectionChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<FieldSuggestion>>) => {
      const selectedOption = newSelectedOptions[0];
      const fieldValue = selectedOption?.value?.name || '';
      field.onChange(fieldValue);
      onChange?.(fieldValue);
    },
    [field, onChange]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedValue = searchValue.trim();
      if (normalizedValue) {
        handleSelectionChange([{ label: normalizedValue, value: { name: normalizedValue } }]);
      }
    },
    [handleSelectionChange]
  );

  const defaultLabel = i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorSourceLabel',
    { defaultMessage: 'Source field' }
  );

  const defaultHelpText = i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorSourceHelpText',
    { defaultMessage: 'Select or enter a field name' }
  );

  const defaultPlaceholder = i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorPlaceholder',
    { defaultMessage: 'Select or type a field name...' }
  );

  return (
    <>
      <EuiFormRow
        label={label ?? defaultLabel}
        helpText={helpText ?? defaultHelpText}
        isInvalid={fieldState.invalid}
        error={fieldState.error?.message}
        fullWidth
      >
        <EuiComboBox
          data-test-subj="streamsAppProcessorFieldSelectorComboFieldText"
          placeholder={placeholder ?? defaultPlaceholder}
          options={suggestions}
          selectedOptions={selectedOptions}
          onChange={handleSelectionChange}
          onCreateOption={handleCreateOption}
          singleSelection={{ asPlainText: true }}
          isInvalid={fieldState.invalid}
          isClearable
          fullWidth
          customOptionText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorCustomOptionText',
            {
              defaultMessage: 'Add {searchValue} as a custom field',
              values: { searchValue: '{searchValue}' },
            }
          )}
        />
      </EuiFormRow>
    </>
  );
};
