import type { FC } from 'react';
interface ColorRangeLegendProps {
    colorRange: (d: number) => string;
    justifyTicks?: boolean;
    showTicks?: boolean;
    title?: string;
    width?: number;
}
/**
 * Component to render a legend for color ranges to be used for color coding
 * table cells and visualizations.
 *
 * This current version supports normalized value ranges (0-1) only.
 *
 * @param props ColorRangeLegendProps
 */
export declare const ColorRangeLegend: FC<ColorRangeLegendProps>;
export {};
