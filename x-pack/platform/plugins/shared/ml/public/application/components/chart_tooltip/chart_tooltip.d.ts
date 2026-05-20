import type { FC } from 'react';
import React from 'react';
import type { TooltipData } from './chart_tooltip_service';
import { ChartTooltipService } from './chart_tooltip_service';
/**
 * Pure component for rendering the tooltip content with a custom layout across the ML plugin.
 */
export declare const FormattedTooltip: FC<{
    tooltipData: TooltipData;
}>;
interface MlTooltipComponentProps {
    children: (tooltipService: ChartTooltipService) => React.ReactElement;
}
export declare const MlTooltipComponent: FC<MlTooltipComponentProps>;
export {};
