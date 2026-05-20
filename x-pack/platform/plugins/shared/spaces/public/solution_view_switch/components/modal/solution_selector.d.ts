import React from 'react';
import type { SupportedSolutionView } from '../../types';
interface SolutionSelectorProps {
    selectedSolution: SupportedSolutionView;
    onSolutionChange: (solution: SupportedSolutionView) => void;
}
export declare const SolutionSelector: ({ selectedSolution, onSolutionChange }: SolutionSelectorProps) => React.JSX.Element;
export {};
