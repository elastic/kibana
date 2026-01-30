/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import { useMemo } from 'react';
import { useSimulatorSelector } from '../components/data_management/stream_detail_enrichment/state_management/stream_enrichment_state_machine/use_stream_enrichment';
import { selectPreviewRecords } from '../components/data_management/stream_detail_enrichment/state_management/simulation_state_machine/selectors';
import { useStreamSamplesSelector } from '../components/data_management/stream_detail_routing/state_management/stream_routing_state_machine/use_stream_routing';
import { selectPreviewDocuments } from '../components/data_management/stream_detail_routing/state_management/stream_routing_state_machine/selectors';
import { createFieldSuggestions } from '../components/data_management/stream_detail_enrichment/steps/blocks/action/utils/field_suggestions';
import type { Suggestion } from '../components/data_management/shared/autocomplete_selector';

/**
 * Hook for providing field suggestions from enrichment simulation data - to be used with Enrichment only
 *
 * When condition filtering is active and no documents match the condition,
 * falls back to all samples to ensure field suggestions are always available.
 */
export const useEnrichmentFieldSuggestions = (): Suggestion[] => {
  const previewRecords = useSimulatorSelector((state) => selectPreviewRecords(state.context));
  const allSamples = useSimulatorSelector((state) => state.context.samples);
  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);

  return useMemo(() => {
    // Fall back to all samples when condition-filtered records are empty.
    // This ensures field suggestions are always available, even when
    // creating/editing processors under conditions with 0% match rate.
    const recordsForSuggestions =
      previewRecords.length > 0
        ? previewRecords
        : (allSamples.map((sample) => flattenObjectNestedLast(sample.document)) as FlattenRecord[]);

    return createFieldSuggestions(recordsForSuggestions, detectedFields);
  }, [previewRecords, allSamples, detectedFields]);
};

/**
 * Hook for providing field suggestions from routing samples data - to be used with Routing only
 */
export const useRoutingFieldSuggestions = (): Suggestion[] => {
  const previewRecords = useStreamSamplesSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  return useMemo(() => {
    return createFieldSuggestions(previewRecords);
  }, [previewRecords]);
};
