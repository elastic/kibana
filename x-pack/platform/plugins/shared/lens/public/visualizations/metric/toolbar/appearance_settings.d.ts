import React from 'react';
import type { MetricVisualizationState } from '@kbn/lens-common';
/**
 * This component contains the actual settings UI.
 * It is reused by both the Popover and the Flyout.
 */
export declare function MetricAppearanceSettings({ state, setState, }: {
    state: MetricVisualizationState;
    setState: (newState: MetricVisualizationState) => void;
}): React.JSX.Element;
