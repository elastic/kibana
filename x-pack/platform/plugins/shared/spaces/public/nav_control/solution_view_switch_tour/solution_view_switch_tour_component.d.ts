import type { ElementTarget } from '@elastic/eui';
import React from 'react';
import type { SupportedSolutionView } from '../../solution_view_switch';
export interface SolutionViewSwitchTourComponentProps {
    anchor: ElementTarget;
    solution: SupportedSolutionView;
    isOpen: boolean;
    onFinish: () => void;
    onClickSpaceSettings: () => void;
}
export declare const SolutionViewSwitchTourComponent: ({ anchor, solution, isOpen, onFinish, onClickSpaceSettings, }: SolutionViewSwitchTourComponentProps) => React.JSX.Element;
