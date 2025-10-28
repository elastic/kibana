/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import { FieldSelector } from '../../../../shared/field_selector';
import { useEnrichmentFieldSuggestions } from '../../../../../../hooks/use_field_suggestions';

export interface ProcessorFieldSelectorProps {
  fieldKey?: string;
  helpText?: string;
  placeholder?: string;
  label?: string;
  onChange?: (value: string) => void;
}

export const ProcessorFieldSelector = ({
  fieldKey = 'from',
  helpText,
  placeholder,
  label,
  onChange,
}: ProcessorFieldSelectorProps) => {
  const suggestions = useEnrichmentFieldSuggestions();

  const { field, fieldState } = useController({
    name: fieldKey,
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorRequiredError',
        { defaultMessage: 'A field value is required.' }
      ),
    },
  });

  const handleChange = useCallback(
    (value: string) => {
      field.onChange(value);
      onChange?.(value);
    },
    [field, onChange]
  );

  const defaultLabel = i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorSourceLabel',
    { defaultMessage: 'Source Field' }
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
    <FieldSelector
      value={field.value}
      onChange={handleChange}
      label={label ?? defaultLabel}
      helpText={helpText ?? defaultHelpText}
      placeholder={placeholder ?? defaultPlaceholder}
      suggestions={suggestions}
      fullWidth
      dataTestSubj="streamsAppProcessorFieldSelectorComboFieldText"
      isInvalid={fieldState.invalid}
      error={fieldState.error?.message}
    />
  );
};
