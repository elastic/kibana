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
export declare function canRunSimulationForStep({ canRunSimulation, additiveStepIds, stepId, simulationMode, }: CanRunSimulationParams): boolean;
