/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import { useStreamsRoutingSelector } from '../../stream_detail_routing/state_management/stream_routing_state_machine';
import { createFieldSuggestions } from '../../stream_detail_enrichment/steps/blocks/action/utils/field_suggestions';
import type { FieldSuggestion } from '../field_selector';

/**
 * Hook for providing field suggestions from routing samples data
 */
export const useRoutingFieldSuggestions = (): FieldSuggestion[] => {
  const routingSamplesRef = useStreamsRoutingSelector(
    (state) => state.children.routingSamplesMachine
  );

  return useMemo(() => {
    if (!routingSamplesRef) return [];

    const samplesSnapshot = routingSamplesRef.getSnapshot();
    const documents = samplesSnapshot.context.documents;

    // Convert SampleDocument[] to FlattenRecord[] (same format as enrichment)
    const previewRecords = documents.map((doc) =>
      flattenObjectNestedLast(doc.document)
    ) as FlattenRecord[];

    // Create suggestions using the same logic as enrichment (without detected fields)
    const fields = createFieldSuggestions(previewRecords);

    return fields.map((field) => ({
      label: field.name,
      value: field.name,
      'data-test-subj': `field-suggestion-${field.name}`,
    }));
  }, [routingSamplesRef]);
};