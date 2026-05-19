import React from 'react';
import type { AxesSettingsConfigKeys } from '../types';
export interface AxisTicksSettingsProps {
    /**
     * Determines the axis
     */
    axis: AxesSettingsConfigKeys;
    /**
     * Callback to axis ticks status change
     */
    updateTicksVisibilityState: (visible: boolean, axis: AxesSettingsConfigKeys) => void;
    /**
     * Determines if the axis tick labels are visible
     */
    isAxisLabelVisible: boolean;
}
export declare const AxisTicksSettings: React.FunctionComponent<AxisTicksSettingsProps>;
