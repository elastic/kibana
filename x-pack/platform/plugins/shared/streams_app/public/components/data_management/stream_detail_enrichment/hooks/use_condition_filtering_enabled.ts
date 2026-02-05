/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { collectDescendantProcessorIdsForCondition } from '../state_management/simulation_state_machine';
import {
  useInteractiveModeSelector,
  useSimulatorSelector,
} from '../state_management/stream_enrichment_state_machine';

/**
 * Determine if condition filtering is enabled for a given condition block.
 * The filtering on a condition is enabled either if the condition is currently
 * selected or it has at least one new descendant processor in the current simulation.
 */
export function useConditionFilteringEnabled(conditionId: string) {
  const stepRefs = useInteractiveModeSelector((state) => state.context.stepRefs);
  const isConditionSelected = useSimulatorSelector(
    (snapshot) => snapshot.context.selectedConditionId === conditionId
  );

  const newProcessorsForCondition = useMemo(() => {
    const newSteps = stepRefs
      .filter((ref) => ref.getSnapshot()?.context.isNew)
      .map((ref) => ref.getSnapshot()?.context.step);

    return collectDescendantProcessorIdsForCondition(newSteps, conditionId);
  }, [stepRefs, conditionId]);

  return isConditionSelected || newProcessorsForCondition.length !== 0;
}
