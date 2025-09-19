/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { createFieldSuggestions, type FieldSuggestion } from '../utils/field_suggestions';
import { useSimulatorSelector } from '../../../../state_management/stream_enrichment_state_machine';
import { selectPreviewRecords } from '../../../../state_management/simulation_state_machine/selectors';

/**
 * Hook for providing field suggestions from simulation data for EuiComboBox
 */
export const useFieldSuggestions = (
  processorType?: string
): Array<EuiComboBoxOptionOption<FieldSuggestion>> => {
  const previewRecords = useSimulatorSelector((state) => selectPreviewRecords(state.context));
  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);

  return useMemo(() => {
    const fields = createFieldSuggestions(previewRecords, detectedFields);

    return fields.map((field) => ({
      label: field.name,
      value: field,
      'data-test-subj': `field-suggestion-${field.name}`,
    }));
  }, [previewRecords, detectedFields]);
};
