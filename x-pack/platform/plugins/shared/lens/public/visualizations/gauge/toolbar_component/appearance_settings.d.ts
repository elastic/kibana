import React from 'react';
import type { GaugeVisualizationState } from '../constants';
export declare const bulletTypes: {
    id: string;
    label: string;
}[];
export declare function AppearanceSettings({ state, setState, }: {
    state: GaugeVisualizationState;
    setState: (newState: GaugeVisualizationState) => void;
}): React.JSX.Element;
