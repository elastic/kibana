import React from 'react';
import type { EuiIconProps, EuiThemeComputed } from '@elastic/eui';
type Size = keyof EuiThemeComputed['size'] & EuiIconProps['size'];
/**
 * Parameters for the styles for the AI Assistant beacon.
 */
export interface AssistantBeaconProps {
    /**
     * Background color for the beacon.
     */
    backgroundColor?: keyof EuiThemeComputed['colors'];
    /**
     * Size of the beacon.
     */
    size?: Size;
    /**
     * Color of the rings around the icon.
     */
    ringsColor?: string;
}
/**
 * An AI Assistant icon with a pulsing ring around it, used in "hero" areas promoting functionality or prompting interaction.
 */
export declare const AssistantBeacon: ({ backgroundColor, size, ringsColor, }: AssistantBeaconProps) => React.JSX.Element;
export {};
