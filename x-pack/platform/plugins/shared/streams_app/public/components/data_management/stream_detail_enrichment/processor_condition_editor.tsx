import React from 'react';
import { useEnrichmentFieldSuggestions } from '../../../hooks/use_field_suggestions';
import { ConditionEditor, ConditionEditorProps } from '../shared/condition_editor';

export type ProcessorConditionEditorProps = Omit<
  ConditionEditorProps,
  'status' | 'fieldSuggestions'
>;

export function ProcessorConditionEditorWrapper(props: ProcessorConditionEditorProps) {
  const fieldSuggestions = useEnrichmentFieldSuggestions();
  return <ConditionEditor status="enabled" {...props} fieldSuggestions={fieldSuggestions} />;
}
