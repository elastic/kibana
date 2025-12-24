/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type StringOrNumberOrBoolean } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { useEffect, useMemo, useState } from 'react';
import type { Suggestion } from '../components/data_management/shared/autocomplete_selector';
import { selectPreviewRecords } from '../components/data_management/stream_detail_enrichment/state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../components/data_management/stream_detail_enrichment/state_management/stream_enrichment_state_machine';
import {
  selectPreviewDocuments,
  useStreamSamplesSelector,
} from '../components/data_management/stream_detail_routing/state_management/stream_routing_state_machine';

const MAX_RECORDS_STORED = 1000;

export interface ValueSuggestionsOptions {
  /** When true, array values are flattened to show individual elements as suggestions */
  flattenArrays?: boolean;
}

/**
 * Create field suggestions from accumulated simulation records.
 * @param previewRecords array of flattened records
 * @param field field name to extract unique values for
 * @param options configuration options for suggestion generation
 * @returns array of unique values for the specified field
 */
const createValueSuggestions = (
  previewRecords: FlattenRecord[] = [],
  field?: string,
  options?: ValueSuggestionsOptions
): Suggestion[] => {
  if (!field) {
    return [];
  }

  const { flattenArrays = false } = options ?? {};
  const suggestions = new Set<StringOrNumberOrBoolean>();

  previewRecords.forEach((record) => {
    const value = record[field];
    if (value !== undefined) {
      if (flattenArrays && Array.isArray(value)) {
        // Flatten array values to show individual elements as suggestions
        value.forEach((item) => {
          if (item !== undefined && item !== null) {
            suggestions.add(item as StringOrNumberOrBoolean);
          }
        });
      } else {
        suggestions.add(value as StringOrNumberOrBoolean);
      }
    }
  });

  return Array.from(suggestions)
    .sort()
    .map((value) => ({ name: String(value) }));
};

const useValueSuggestions = (
  previewRecords: FlattenRecord[],
  field?: string,
  options?: ValueSuggestionsOptions
): Suggestion[] => {
  const [records, setRecords] = useState<FlattenRecord[]>([]);

  useEffect(() => {
    setRecords((prevRecords) => {
      const combined = [...previewRecords, ...prevRecords];

      return combined.slice(0, MAX_RECORDS_STORED);
    });
  }, [previewRecords]);

  return useMemo(() => {
    return createValueSuggestions(records, field, options);
  }, [records, field, options]);
};

/**
 * Hook for providing value suggestions from enrichment simulation data - to be used with Enrichment only
 * @param field field name to extract unique values for
 * @param options configuration options for suggestion generation
 * @returns array of unique suggestions for the specified field
 */
export const useEnrichmentValueSuggestions = (
  field?: string,
  options?: ValueSuggestionsOptions
): Suggestion[] => {
  return useValueSuggestions(
    useSimulatorSelector((state) => selectPreviewRecords(state.context)),
    field,
    options
  );
};

/**
 * Hook for providing value suggestions from routing samples data - to be used with Routing only
 * @param field field name to extract unique values for
 * @param options configuration options for suggestion generation
 * @returns array of unique suggestions for the specified field
 */
export const useRoutingValueSuggestions = (
  field?: string,
  options?: ValueSuggestionsOptions
): Suggestion[] => {
  return useValueSuggestions(
    useStreamSamplesSelector((snapshot) => selectPreviewDocuments(snapshot.context)),
    field,
    options
  );
};
