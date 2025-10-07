/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StringOrNumberOrBoolean } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { useMemo } from 'react';
import {
  selectDocumentsForSuggestions,
  useStreamSamplesSelector,
} from '../components/data_management/stream_detail_routing/state_management/stream_routing_state_machine';

type Suggestions = Record<string, StringOrNumberOrBoolean[]>;

/**
 * Create field suggestions from accumulated simulation records
 * @returns dictionary of field names to array of unique values. e.g { "field1": ["value1", "value2"], "field2": [true, false], ... }
 */
const createValueSuggestions = (previewRecords: FlattenRecord[] = []): Suggestions => {
  const accumulator: Record<string, Set<StringOrNumberOrBoolean>> = {};

  for (const record of previewRecords) {
    for (const [key, rawValue] of Object.entries(record)) {
      if (rawValue !== undefined) {
        const value = rawValue as StringOrNumberOrBoolean;
        if (!accumulator[key]) {
          accumulator[key] = new Set();
        }
        accumulator[key].add(value);
      }
    }
  }

  return Object.fromEntries(Object.entries(accumulator).map(([key, set]) => [key, [...set]]));
};

/**
 * Hook for providing value suggestions from routing samples data - to be used with Routing only
 */
export const useRoutingValueSuggestions = (): Suggestions => {
  const previewRecords = useStreamSamplesSelector((snapshot) =>
    selectDocumentsForSuggestions(snapshot.context)
  );

  return useMemo(() => {
    return createValueSuggestions(previewRecords);
  }, [previewRecords]);
};
