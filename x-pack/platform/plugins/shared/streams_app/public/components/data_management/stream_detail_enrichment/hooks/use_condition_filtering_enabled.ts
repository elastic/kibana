/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { collectProcessorIdsForCondition } from '../state_management/simulation_state_machine';
import { useStreamEnrichmentSelector } from '../state_management/stream_enrichment_state_machine';
import { useStepsProcessingSummary } from './use_steps_processing_summary';

export function useConditionFilteringEnabled(conditionId: string) {
  const stepRefs = useStreamEnrichmentSelector((state) => state.context.stepRefs);
  const simulatorSteps = stepRefs.map((ref) => ref.getSnapshot()?.context.step);
  const stepsProcessingSummaryMap = useStepsProcessingSummary();

  const successfulProcessorsForCondition = useMemo(() => {
    return collectProcessorIdsForCondition(simulatorSteps, conditionId).filter((processorId) => {
      return stepsProcessingSummaryMap?.get(processorId) === 'successful';
    });
  }, [simulatorSteps, conditionId, stepsProcessingSummaryMap]);

  return successfulProcessorsForCondition.length !== 0;
}
