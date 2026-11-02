/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActionBlock } from '@kbn/streamlang';
import { useMemo } from 'react';
import { selectWhetherAnyProcessorBeforePersisted } from '../state_management/interactive_mode_machine/selectors';
import {
  useInteractiveModeSelector,
  useSimulatorSelector,
  useStreamEnrichmentSelector,
} from '../state_management/stream_enrichment_state_machine';
import { getActiveSimulationMode } from '../state_management/stream_enrichment_state_machine/utils';

export type StepsProcessingSummaryMap = Map<string, StepProcessingStatus>;
type StepProcessingStatus =
  | 'pending'
  | 'running'
  | 'failed'
  | 'successful'
  | 'disabled.processorBeforePersisted'
  | 'skipped.followsProcessorBeingEdited'
  | 'skipped.excludedByFilteringCondition'
  | 'skipped.createdInPreviousSimulation'
  | 'condition';

export const useStepsProcessingSummary = () => {
  const stepsContext = useInteractiveModeSelector((state) => {
    return new Map(
      state.context.stepRefs.map((stepRef) => [stepRef.id, stepRef.getSnapshot().context])
    );
  });

  const hasSimulation = useSimulatorSelector((snapshot) => Boolean(snapshot.context.simulation));

  const isSimulationRunning = useSimulatorSelector((snapshot) =>
    snapshot.matches('runningSimulation')
  );

  const processorMetrics = useSimulatorSelector(
    (snapshot) => snapshot.context.simulation?.processors_metrics
  );

  const simulatorSteps = useSimulatorSelector((snapshot) => {
    return snapshot.context.steps;
  });

  const simulationMode = useStreamEnrichmentSelector((snapshot) =>
    getActiveSimulationMode(snapshot.context)
  );
  const isPartialSimulation = simulationMode === 'partial';

  const isAnyProcessorBeforePersisted = useInteractiveModeSelector((snapshot) =>
    selectWhetherAnyProcessorBeforePersisted(snapshot.context)
  );

  const isFilteringByCondition = useSimulatorSelector(
    (snapshot) => snapshot.context.selectedConditionId !== undefined
  );

  const stepsProcessingSummary = useMemo(() => {
    const summaryMap: StepsProcessingSummaryMap = new Map();

    Array.from(stepsContext.entries()).forEach(([stepId, stepContext]) => {
      if (isActionBlock(stepContext.step)) {
        const isParticipatingInSimulation = simulatorSteps.find(
          (p) => p.customIdentifier === stepId
        );
        const isFailing = Boolean(
          processorMetrics?.[stepId]?.errors.some((e) => e.type === 'generic_simulation_failure')
        );
        const isPending = hasSimulation && !processorMetrics?.[stepId];
        if (isPartialSimulation && isAnyProcessorBeforePersisted) {
          summaryMap.set(stepId, 'disabled.processorBeforePersisted');
        } else if (!isParticipatingInSimulation) {
          if (stepContext.isNew) {
            if (isFilteringByCondition) {
              summaryMap.set(stepId, 'skipped.excludedByFilteringCondition');
            } else {
              summaryMap.set(stepId, 'skipped.followsProcessorBeingEdited');
            }
          } else {
            summaryMap.set(stepId, 'skipped.createdInPreviousSimulation');
          }
        } else if (isSimulationRunning) {
          summaryMap.set(stepId, 'running');
        } else if (!hasSimulation || isPending) {
          summaryMap.set(stepId, 'pending');
        } else if (isFailing) {
          summaryMap.set(stepId, 'failed');
        } else {
          summaryMap.set(stepId, 'successful');
        }
      } else {
        summaryMap.set(stepId, 'condition');
      }
    });
    return summaryMap;
  }, [
    hasSimulation,
    isAnyProcessorBeforePersisted,
    isFilteringByCondition,
    isPartialSimulation,
    isSimulationRunning,
    processorMetrics,
    simulatorSteps,
    stepsContext,
  ]);

  return stepsProcessingSummary;
};
