/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import type { SchemaField } from '../types';

interface FieldFormFormatProps {
  value: SchemaField['format'];
  onChange: (format: SchemaField['format']) => void;
}

const POPULAR_FORMATS_SUGGESTIONS = [
  { label: 'strict_date_optional_time' },
  { label: 'date_optional_time' },
  { label: 'epoch_millis' },
  { label: 'basic_date_time' },
];

export const typeSupportsFormat = (type?: FieldDefinitionConfig['type']) => {
  if (!type) return false;
  return ['date'].includes(type);
};

export const FieldFormFormat = ({ value, onChange }: FieldFormFormatProps) => {
  const selectedOptions = useMemo(() => {
    if (!value) return [];

    const matchingSuggestion = POPULAR_FORMATS_SUGGESTIONS.find(
      (suggestion) => suggestion.label === value
    );
    return matchingSuggestion ? [matchingSuggestion] : [{ label: value }];
  }, [value]);

  const handleSelectionChange = (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedOption = newSelectedOptions[0];
    const newFieldValue = selectedOption?.label ?? '';
    onChange(newFieldValue);
  };

  const handleCreateOption = (searchValue: string) => {
    const normalizedValue = searchValue.trim();
    if (normalizedValue) {
      handleSelectionChange([{ label: normalizedValue }]);
    }
  };

  const placeholderText = i18n.translate(
    'xpack.streams.schemaEditor.fieldFormatSelector.placeholderText',
    { defaultMessage: 'Select or type the field format...' }
  );

  return (
    <EuiComboBox
      data-test-subj="streamsAppSchemaEditorFieldFormFormat"
      placeholder={placeholderText}
      aria-label={placeholderText}
      options={POPULAR_FORMATS_SUGGESTIONS}
      selectedOptions={selectedOptions}
      onChange={handleSelectionChange}
      onCreateOption={handleCreateOption}
      singleSelection={{ asPlainText: true }}
      isClearable
      fullWidth
      customOptionText={i18n.translate(
        'xpack.streams.schemaEditor.fieldFormatSelector.customOptionText',
        {
          defaultMessage: 'Add {searchValue} as a custom format',
          values: { searchValue: '{searchValue}' },
        }
      )}
    />
  );
};
