/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import type { DetectedField } from '../../state_management/simulation_state_machine/types';
import { getAllFieldsInOrder } from '../../state_management/simulation_state_machine';

export interface FieldSuggestion {
  name: string;
}

/**
 * Create field suggestions from simulation records and detected fields
 * Uses the centralized field ordering logic from simulation state machine
 */
export function createFieldSuggestions(
  previewRecords?: FlattenRecord[],
  detectedFields?: DetectedField[]
): FieldSuggestion[] {
  const orderedFields = getAllFieldsInOrder(previewRecords, detectedFields);
  return orderedFields.map((fieldName) => ({ name: fieldName }));
}

/**
 * Sort fields by processor type preference (based on field names)
 */
export function sortFieldsByProcessorType(
  fields: FieldSuggestion[],
  processorType?: string
): FieldSuggestion[] {
  if (!processorType) return fields;

  return [...fields].sort((a, b) => {
    // For grok processor, prioritize message-like fields
    if (processorType === 'grok') {
      const messageFields = ['message', 'log', 'event', 'text'];
      const aIsMessage = messageFields.some((field) => a.name.toLowerCase().includes(field));
      const bIsMessage = messageFields.some((field) => b.name.toLowerCase().includes(field));

      if (aIsMessage && !bIsMessage) return -1;
      if (!aIsMessage && bIsMessage) return 1;
    }

    // Default alphabetical sort
    return a.name.localeCompare(b.name);
  });
}
