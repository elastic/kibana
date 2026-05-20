import type { FC, ReactNode } from 'react';
export interface SingleMetricViewerChartSurfaceProps {
    fieldNamesWithEmptyValues: string[];
    /** Controls row, title, forecast modal, etc. */
    controlsSlot?: ReactNode;
    /** Main chart + related blocks */
    children?: ReactNode;
}
/**
 * Thin layout shell for SMV chart hosts: partition gate callout + optional controls + body.
 *
 * Used by `TimeSeriesExplorerEmbeddableChart` (dashboard SMV) and `TimeSeriesExplorer` (full-page SMV) for consistent partition gate + body layout.
 */
export declare const SingleMetricViewerChartSurface: FC<SingleMetricViewerChartSurfaceProps>;
