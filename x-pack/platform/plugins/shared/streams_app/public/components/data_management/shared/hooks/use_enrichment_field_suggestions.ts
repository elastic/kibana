/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSimulatorSelector } from '../../stream_detail_enrichment/state_management/stream_enrichment_state_machine';
import { selectPreviewRecords } from '../../stream_detail_enrichment/state_management/simulation_state_machine/selectors';
import { createFieldSuggestions } from '../../stream_detail_enrichment/steps/blocks/action/utils/field_suggestions';
import type { FieldSuggestion } from '../field_selector';

/**
 * Hook for providing field suggestions from enrichment simulation data
 */
export const useEnrichmentFieldSuggestions = (): FieldSuggestion[] => {
  const previewRecords = useSimulatorSelector((state) => selectPreviewRecords(state.context));
  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);

  return useMemo(() => {
    const fields = createFieldSuggestions(previewRecords, detectedFields);

    return fields.map((field) => ({
      label: field.name,
      value: field.name,
      'data-test-subj': `field-suggestion-${field.name}`,
    }));
  }, [previewRecords, detectedFields]);
};