import type { XYVisualizationState } from '../../../../../public/visualizations/xy/types';
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedLegendValueXYState extends XYVisualizationState {
    valuesInLegend?: boolean;
}
export declare function convertXYToLegendStats(state: DeprecatedLegendValueXYState | XYVisualizationState): XYVisualizationState;
