/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StringOrNumberOrBoolean } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { useEffect, useMemo, useState } from 'react';
import {
  selectPreviewDocuments,
  useStreamSamplesSelector,
} from '../components/data_management/stream_detail_routing/state_management/stream_routing_state_machine';
import type { Suggestion } from '../components/data_management/shared/autocomplete_selector';

/**
 * Create field suggestions from accumulated simulation records
 * @param previewRecords array of flattened records
 * @param field field name to extract unique values for
 * @returns array of unique values for the specified field
 */
const createValueSuggestions = (
  previewRecords: FlattenRecord[] = [],
  field?: string
): Suggestion[] => {
  if (!field) {
    return [];
  }

  const suggestions = new Set<StringOrNumberOrBoolean>();

  previewRecords.forEach((record) => {
    const value = record[field];
    if (value !== undefined) {
      suggestions.add(value as StringOrNumberOrBoolean);
    }
  });

  return Array.from(suggestions).map((value) => ({ name: String(value) }));
};

/**
 * Hook for providing value suggestions from routing samples data - to be used with Routing only
 */
export const useRoutingValueSuggestions = (field?: string): Suggestion[] => {
  const [records, setRecords] = useState<FlattenRecord[]>([]);

  const previewRecords = useStreamSamplesSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  useEffect(() => {
    setRecords((prevRecords) => [...prevRecords, ...previewRecords]);
  }, [previewRecords]);

  return useMemo(() => {
    return createValueSuggestions(records, field);
  }, [records, field]);
};
