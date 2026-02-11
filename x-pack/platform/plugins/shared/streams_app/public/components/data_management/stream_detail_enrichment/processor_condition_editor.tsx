/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { default as React, useMemo } from 'react';
import { useEnrichmentFieldSuggestions } from '../../../hooks/use_field_suggestions';
import { useStreamDataViewFieldTypes } from '../../../hooks/use_stream_data_view_field_types';
import { useEnrichmentValueSuggestions } from '../../../hooks/use_value_suggestions';
import {
  getFilterConditionField,
  getFilterConditionOperator,
  isArrayOperator,
} from '../../../util/condition';
import type { ConditionEditorProps } from '../shared/condition_editor';
import { ConditionEditor } from '../shared/condition_editor';
import { useSimulatorSelector } from './state_management/stream_enrichment_state_machine/use_stream_enrichment';

export type ProcessorConditionEditorProps = Omit<
  ConditionEditorProps,
  'status' | 'fieldSuggestions'
>;

export function ProcessorConditionEditorWrapper(props: ProcessorConditionEditorProps) {
  const fieldSuggestions = useEnrichmentFieldSuggestions();
  const operator = getFilterConditionOperator(props.condition);
  const valueSuggestions = useEnrichmentValueSuggestions(getFilterConditionField(props.condition), {
    flattenArrays: isArrayOperator(operator),
  });
  const streamName = useSimulatorSelector((state) => state.context.streamName);

  // Fetch DataView field types for displaying field type icons
  const { fieldTypeMap } = useStreamDataViewFieldTypes(streamName);

  // Enrich field suggestions with types from DataView
  const enrichedFieldSuggestions = useMemo(() => {
    return fieldSuggestions.map((suggestion) => ({
      ...suggestion,
      type: fieldTypeMap.get(suggestion.name),
    }));
  }, [fieldSuggestions, fieldTypeMap]);

  return (
    <ConditionEditor
      status="enabled"
      {...props}
      fieldSuggestions={enrichedFieldSuggestions}
      valueSuggestions={valueSuggestions}
    />
  );
}
