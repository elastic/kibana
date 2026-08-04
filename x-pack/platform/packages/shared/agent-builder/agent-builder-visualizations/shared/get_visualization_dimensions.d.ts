import { ChartType } from '@kbn/visualization-utils';
export interface VisualizationDimensions {
    height: number;
    /**
     * Recommended container width for the visualization wrapper.
     */
    width?: number;
}
export declare const DEFAULT_VISUALIZATION_HEIGHT = 240;
/**
 * Derives visualization dimensions from a raw lens config object.
 * Used by VisualizeLens where the full config (including gauge shape) is available.
 */
export declare const getVisualizationDimensionsFromLensConfig: (lensConfig: Record<string, unknown>) => VisualizationDimensions;
/**
 * Derives visualization dimensions from a ChartType enum value.
 * Used by VisualizeESQL where only the preferred chart type is known
 * (gauge subtype is unavailable, so arc dimensions are used as the default).
 */
export declare const getVisualizationDimensionsFromChartType: (chartType?: ChartType) => VisualizationDimensions;
