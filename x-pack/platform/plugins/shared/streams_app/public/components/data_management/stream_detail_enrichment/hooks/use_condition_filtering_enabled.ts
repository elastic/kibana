/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { collectDescendantProcessorIdsForCondition } from '../state_management/simulation_state_machine';
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
} from '../state_management/stream_enrichment_state_machine';
import { useStepsProcessingSummary } from './use_steps_processing_summary';

export function useConditionFilteringEnabled(conditionId: string) {
  const stepRefs = useStreamEnrichmentSelector((state) => state.context.stepRefs);
  const simulatorSteps = stepRefs.map((ref) => ref.getSnapshot()?.context.step);
  const hasActiveConditionFilter = useSimulatorSelector(
    (snapshot) => snapshot.context.selectedConditionId !== undefined
  );
  const stepsProcessingSummaryMap = useStepsProcessingSummary();

  const successfulProcessorsForCondition = useMemo(() => {
    return collectDescendantProcessorIdsForCondition(simulatorSteps, conditionId).filter(
      (processorId) => {
        return stepsProcessingSummaryMap?.get(processorId) === 'successful';
      }
    );
  }, [simulatorSteps, conditionId, stepsProcessingSummaryMap]);

  return hasActiveConditionFilter || successfulProcessorsForCondition.length !== 0;
}
