/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEnrichmentFieldSuggestions } from '../../../hooks/use_field_suggestions';
import type { ConditionEditorProps } from '../shared/condition_editor';
import { ConditionEditor } from '../shared/condition_editor';

export type ProcessorConditionEditorProps = Omit<
  ConditionEditorProps,
  'status' | 'fieldSuggestions'
>;

export function ProcessorConditionEditorWrapper(props: ProcessorConditionEditorProps) {
  const fieldSuggestions = useEnrichmentFieldSuggestions();
  return <ConditionEditor status="enabled" {...props} fieldSuggestions={fieldSuggestions} />;
}
