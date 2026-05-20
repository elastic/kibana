import React from 'react';
import { type SolutionViewSwitchTourComponentProps } from './solution_view_switch_tour_component';
export type SolutionViewSwitchTourProps = Omit<SolutionViewSwitchTourComponentProps, 'isOpen'>;
export declare const SolutionViewSwitchTour: (tourProps: SolutionViewSwitchTourProps) => React.JSX.Element;
