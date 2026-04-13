import React from 'react';
import type { monaco } from '@kbn/monaco';
import type { SimulationMode } from '../types';
export interface StepActionsProps {
    stepId: string;
    lineStart: number;
    onRunUpToStep: (stepId: string) => void;
    canRunSimulation: boolean;
    additiveStepIds: string[];
    editor: monaco.editor.IStandaloneCodeEditor | null;
    simulationMode: SimulationMode;
}
export declare const StepActions: React.NamedExoticComponent<StepActionsProps>;
