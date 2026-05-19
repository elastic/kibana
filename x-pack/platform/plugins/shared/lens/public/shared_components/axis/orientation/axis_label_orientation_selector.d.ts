import React from 'react';
import type { AxesSettingsConfigKeys } from '../types';
export declare const allowedOrientations: readonly [0, -45, -90];
export type Orientation = (typeof allowedOrientations)[number];
export interface AxisLabelOrientationSelectorProps {
    axis: AxesSettingsConfigKeys;
    selectedLabelOrientation: Orientation;
    setLabelOrientation: (orientation: Orientation) => void;
}
export declare const AxisLabelOrientationSelector: React.FunctionComponent<AxisLabelOrientationSelectorProps>;
