import React from 'react';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import type { InferenceProvider } from '../../types/types';
interface SelectableProviderProps {
    currentSolution?: SolutionView;
    providers: InferenceProvider[];
    onClosePopover: () => void;
    onProviderChange: (provider?: string) => void;
    onSolutionFilterChange: (solution: SolutionView) => void;
    solutionFilter?: SolutionView;
}
export declare const SelectableProvider: React.FC<SelectableProviderProps>;
export {};
