/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isActionBlock, isConditionBlock } from '@kbn/streamlang';
import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import type { StepStatus } from '@kbn/streamlang-yaml-editor';
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
  useYamlModeSelector,
} from './stream_enrichment_state_machine';
import { selectHasAnyErrors } from './stream_enrichment_state_machine/selectors';

export type YamlStepsProcessingSummaryMap = Map<string, StepStatus>;

export const useYamlStepsProcessingSummary = () => {
  const nextStreamlangDSL = useStreamEnrichmentSelector((state) => state.context.nextStreamlangDSL);
  const hasAnyErrors = useStreamEnrichmentSelector((state) => selectHasAnyErrors(state.context));

  const hasSimulation = useSimulatorSelector((snapshot) => Boolean(snapshot.context.simulation));

  const isSimulationRunning = useSimulatorSelector((snapshot) =>
    snapshot.matches('runningSimulation')
  );

  const simulatorSteps = useSimulatorSelector((snapshot) => {
    return snapshot.context.steps;
  });

  const processorMetrics = useSimulatorSelector(
    (snapshot) => snapshot.context.simulation?.processors_metrics
  );

  const canRunSimulation = useYamlModeSelector((state) =>
    state.can({ type: 'yaml.runSimulation' })
  );

  const stepsProcessingSummary = useMemo(() => {
    const summaryMap: YamlStepsProcessingSummaryMap = new Map();

    // Don't process if there are any validation or schema errors
    if (hasAnyErrors) {
      return summaryMap;
    }

    // Recursively traverse DSL steps and use their existing customIdentifiers
    function traverseSteps(steps: StreamlangStep[]) {
      steps.forEach((step) => {
        const stepId = step.customIdentifier;

        if (!stepId) return;

        // Only process action blocks (not where blocks themselves)
        if (isActionBlock(step)) {
          const isParticipatingInSimulation = simulatorSteps.find(
            (p) => p.customIdentifier === stepId
          );
          const metrics = processorMetrics?.[stepId];
          const hasErrors = Boolean(metrics?.errors?.length);
          const hasFatalError =
            hasErrors &&
            Boolean(
              metrics?.errors?.some(
                (error: { type?: string }) => error.type === 'generic_simulation_failure'
              )
            );
          const isPending = hasSimulation && !processorMetrics?.[stepId];

          let status: StepStatus = 'pending';

          if (!canRunSimulation) {
            status = 'disabled';
          } else if (isSimulationRunning) {
            status = 'running';
          } else if (!isParticipatingInSimulation) {
            status = 'skipped';
          } else if (!hasSimulation || isPending) {
            status = 'pending';
          } else if (hasFatalError) {
            status = 'failure';
          } else if (hasErrors) {
            status = 'successWithWarnings';
          } else {
            status = 'success';
          }

          summaryMap.set(stepId, status);
        }

        // Recursively process nested steps in where blocks
        if (isConditionBlock(step) && step.condition?.steps) {
          traverseSteps(step.condition.steps);
        }
      });
    }

    traverseSteps(nextStreamlangDSL.steps);

    return summaryMap;
  }, [
    hasAnyErrors,
    nextStreamlangDSL.steps,
    simulatorSteps,
    processorMetrics,
    hasSimulation,
    canRunSimulation,
    isSimulationRunning,
  ]);

  return stepsProcessingSummary;
};
