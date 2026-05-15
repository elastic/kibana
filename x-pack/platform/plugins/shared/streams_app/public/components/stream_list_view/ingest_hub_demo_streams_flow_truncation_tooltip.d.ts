import type { ReactNode } from 'react';
import React from 'react';
export interface FlowCanvasTruncationTooltipProps {
    readonly tooltipContent: ReactNode;
    readonly children: ReactNode;
}
/**
 * Wraps single-line title content; shows {@link EuiToolTip} only when the label is truncated.
 */
export declare function FlowCanvasTruncationTooltip({ tooltipContent, children, }: FlowCanvasTruncationTooltipProps): React.JSX.Element;
