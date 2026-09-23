/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import { useEffect, useMemo, useState } from 'react';
import type { Suggestion } from '../../shared/autocomplete_selector';
import { selectPreviewRecords } from '../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../state_management/stream_enrichment_state_machine';

const MAX_RECORDS_STORED = 1000;
type SuggestiblePrimitive = string | number | boolean;

export interface ValueSuggestionsOptions {
  flattenArrays?: boolean;
}

const createValueSuggestions = (
  previewRecords: FlattenRecord[] = [],
  field?: string,
  options?: ValueSuggestionsOptions
): Suggestion[] => {
  if (!field) {
    return [];
  }

  const { flattenArrays = false } = options ?? {};
  const suggestions = new Map<string, SuggestiblePrimitive | SuggestiblePrimitive[]>();

  previewRecords.forEach((record) => {
    const value = record[field];
    if (value === undefined || value === null) {
      return;
    }

    if (flattenArrays && Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          const key = String(item);
          if (!suggestions.has(key)) {
            suggestions.set(key, item as SuggestiblePrimitive);
          }
        }
      });
      return;
    }

    const key = Array.isArray(value) ? JSON.stringify(value) : String(value);
    if (!suggestions.has(key)) {
      suggestions.set(key, value as SuggestiblePrimitive | SuggestiblePrimitive[]);
    }
  });

  return Array.from(suggestions.values())
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((value) => ({ name: Array.isArray(value) ? JSON.stringify(value) : String(value) }));
};

export const useEnrichmentValueSuggestions = (
  field?: string,
  options?: ValueSuggestionsOptions
): Suggestion[] => {
  const [records, setRecords] = useState<FlattenRecord[]>([]);
  const previewRecords = useSimulatorSelector((state) => selectPreviewRecords(state.context));

  useEffect(() => {
    setRecords((prevRecords) => {
      const combined = [...previewRecords, ...prevRecords];
      return combined.slice(0, MAX_RECORDS_STORED);
    });
  }, [previewRecords]);

  return useMemo(() => createValueSuggestions(records, field, options), [records, field, options]);
};
