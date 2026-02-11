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
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
} from '../../../state_management/stream_enrichment_state_machine';
import { useProcessorContext } from './processor_context';

export interface ProcessorFieldSelectorProps {
  fieldKey?: string;
  helpText?: string;
  placeholder?: string;
  label?: string;
  onChange?: (value: string) => void;
  labelAppend?: React.ReactNode;
  processorId?: string;
}

export const ProcessorFieldSelector = ({
  fieldKey = 'from',
  helpText,
  placeholder,
  label,
  onChange,
  labelAppend,
  processorId: processorIdProp,
}: ProcessorFieldSelectorProps) => {
  const fieldSuggestions = useEnrichmentFieldSuggestions();
  const streamName = useSimulatorSelector((state) => state.context.streamName);
  const processorContext = useProcessorContext();

  // Use processorId from context if available, otherwise use prop
  const processorId = processorContext?.processorId ?? processorIdProp;

  // Fetch DataView field types with automatic caching via React Query
  const { fieldTypeMap } = useStreamDataViewFieldTypes(streamName);

  // Get validation-based field types for this processor
  const validationFieldTypes = useStreamEnrichmentSelector((state) => {
    if (!processorId) return new Map();
    return state.context.fieldTypesByProcessor.get(processorId) || new Map();
  });

  // Enrich field suggestions with types from DataView and validation
  const suggestions = useMemo(() => {
    return fieldSuggestions.map((suggestion) => {
      // Prefer validation-based type over mapping-based type
      const validationType = validationFieldTypes.get(suggestion.name);
      const mappingType = fieldTypeMap.get(suggestion.name);
      return {
        ...suggestion,
        type: validationType || mappingType,
      };
    });
  }, [fieldSuggestions, fieldTypeMap, validationFieldTypes]);

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
