import React from 'react';
import { VerticalAlignment, HorizontalAlignment, Position } from '@elastic/charts';
export interface LegendLocationSettingsProps {
    /**
     * Sets the legend position
     */
    position?: Position;
    /**
     * Callback on position option change
     */
    onPositionChange: (id: string) => void;
    /**
     * Determines the legend location
     */
    location?: 'inside' | 'outside';
    /**
     * Callback on location option change
     */
    onLocationChange?: (id: string) => void;
    /**
     * Sets the vertical alignment for legend inside chart
     */
    verticalAlignment?: typeof VerticalAlignment.Top | typeof VerticalAlignment.Bottom;
    /**
     * Sets the vertical alignment for legend inside chart
     */
    horizontalAlignment?: typeof HorizontalAlignment.Left | typeof HorizontalAlignment.Right;
    /**
     * Callback on horizontal alignment option change
     */
    onAlignmentChange?: (id: string) => void;
    /**
     * Flag to disable the location settings
     */
    isDisabled?: boolean;
}
export declare const LegendLocationSettings: React.FunctionComponent<LegendLocationSettingsProps>;
