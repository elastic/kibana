import React from 'react';
/**
 * Wrapper to display a tooltip if element is disabled (i.e. due to insufficient permissions)
 */
export declare const DisabledWrapperTooltip: React.FunctionComponent<{
    children: React.ReactElement;
    disabled: boolean;
    tooltipContent: React.ReactNode;
}>;
