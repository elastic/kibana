/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import { useMemo } from 'react';
import type { Suggestion } from '../../shared/autocomplete_selector';
import { selectPreviewRecords } from '../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../state_management/stream_enrichment_state_machine';
import { createFieldSuggestions } from '../steps/blocks/action/utils/field_suggestions';

export const useEnrichmentFieldSuggestions = (): Suggestion[] => {
  const previewRecords = useSimulatorSelector((state) => selectPreviewRecords(state.context));
  const allSamples = useSimulatorSelector((state) => state.context.samples);
  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);

  return useMemo(() => {
    const recordsForSuggestions =
      previewRecords.length > 0
        ? previewRecords
        : (allSamples.map((sample) => flattenObjectNestedLast(sample.document)) as FlattenRecord[]);

    return createFieldSuggestions(recordsForSuggestions, detectedFields);
  }, [previewRecords, allSamples, detectedFields]);
};
