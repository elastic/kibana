import React from 'react';
import type { PropsOf, EuiButtonProps } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
declare const groupPositionToClassMap: {
    none: null;
    left: string;
    center: string;
    right: string;
};
type ButtonPositions = keyof typeof groupPositionToClassMap;
export declare const POSITIONS: ButtonPositions[];
type Weights = 'normal' | 'bold';
export declare const WEIGHTS: Weights[];
export declare const TOOLBAR_BUTTON_SIZES: Array<EuiButtonProps['size']>;
export type ToolbarButtonProps = PropsOf<typeof EuiButton> & {
    /**
     * Determines prominence
     */
    fontWeight?: Weights;
    /**
     * Smaller buttons also remove extra shadow for less prominence
     */
    size?: EuiButtonProps['size'];
    /**
     * Determines if the button will have a down arrow or not
     */
    hasArrow?: boolean;
    /**
     * Adjusts the borders for groupings
     */
    groupPosition?: ButtonPositions;
    dataTestSubj?: string;
    textProps?: EuiButtonProps['textProps'];
};
export declare const ToolbarButton: React.FunctionComponent<ToolbarButtonProps>;
export {};
