/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { default as React, useCallback, useMemo } from 'react';
import { useController } from 'react-hook-form';
import { useEnrichmentFieldSuggestions } from '../../../../../../hooks/use_field_suggestions';
import { useStreamDataViewFieldTypes } from '../../../../../../hooks/use_stream_data_view_field_types';
import { AutocompleteSelector } from '../../../../shared/autocomplete_selector';
import { useSimulatorSelector } from '../../../state_management/stream_enrichment_state_machine';

export interface ProcessorFieldSelectorProps {
  fieldKey?: string;
  helpText?: string;
  placeholder?: string;
  label?: string;
  onChange?: (value: string) => void;
  labelAppend?: React.ReactNode;
}

export const ProcessorFieldSelector = ({
  fieldKey = 'from',
  helpText,
  placeholder,
  label,
  onChange,
  labelAppend,
}: ProcessorFieldSelectorProps) => {
  const fieldSuggestions = useEnrichmentFieldSuggestions();
  const streamName = useSimulatorSelector((state) => state.context.streamName);

  // Fetch DataView field types with automatic caching via React Query
  const { fieldTypeMap } = useStreamDataViewFieldTypes(streamName);

  // Enrich field suggestions with types from DataView
  const suggestions = useMemo(() => {
    return fieldSuggestions.map((suggestion) => ({
      ...suggestion,
      type: fieldTypeMap.get(suggestion.name),
    }));
  }, [fieldSuggestions, fieldTypeMap]);

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
    <AutocompleteSelector
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
      labelAppend={labelAppend}
      showIcon={true}
    />
  );
};
