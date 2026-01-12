/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimulationMode } from '../types';

export interface CanRunSimulationParams {
  /** Whether simulation can currently run */
  canRunSimulation: boolean;
  /** List of step IDs that are new/additive */
  additiveStepIds: string[];
  /** The step ID to check */
  stepId: string;
  /** Current simulation mode */
  simulationMode: SimulationMode;
}

/**
 * Determines if simulation can be run for a specific step.
 *
 * Rules:
 * - In 'complete' simulation mode, any step can be simulated if canRunSimulation is true
 * - In 'partial' simulation mode, only additive (new) steps can be simulated
 */
export function canRunSimulationForStep({
  canRunSimulation,
  additiveStepIds,
  stepId,
  simulationMode,
}: CanRunSimulationParams): boolean {
  const isAdditiveStep = additiveStepIds.includes(stepId);
  const isCompleteSimulation = simulationMode === 'complete';

  return canRunSimulation && (isCompleteSimulation || isAdditiveStep);
}
