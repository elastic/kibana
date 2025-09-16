/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';

export interface FieldSuggestion {
  name: string;
}

/**
 * Extract unique field names from simulation preview records
 */
export function getFieldNamesFromRecords(previewRecords?: FlattenRecord[]): string[] {
  if (!previewRecords?.length) return [];

  const fieldNames = new Set<string>();
  previewRecords.forEach((record) => {
    Object.keys(record).forEach((fieldName) => {
      fieldNames.add(fieldName);
    });
  });

  return Array.from(fieldNames).sort();
}

/**
 * Create field suggestions from simulation records
 */
export function createFieldSuggestions(previewRecords?: FlattenRecord[]): FieldSuggestion[] {
  const fieldNames = getFieldNamesFromRecords(previewRecords);

  return fieldNames.map((fieldName) => ({
    name: fieldName,
  }));
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
    switch (processorType) {
      case 'date':
        // Prioritize fields that likely contain dates based on naming
        const aIsDateField =
          a.name.includes('time') || a.name.includes('date') || a.name.includes('timestamp');
        const bIsDateField =
          b.name.includes('time') || b.name.includes('date') || b.name.includes('timestamp');
        if (aIsDateField && !bIsDateField) return -1;
        if (!aIsDateField && bIsDateField) return 1;
        return 0;

      default:
        // No special sorting for other processors (grok works on any text field)
        return 0;
    }
  });
}
