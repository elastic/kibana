import type { LensPartitionLayerState, LensPartitionVisualizationState } from '@kbn/lens-common';
/** @deprecated */
type DeprecatedLegendValueLayer = LensPartitionLayerState & {
    showValuesInLegend?: boolean;
};
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export type DeprecatedLegendValueLensPartitionVisualizationState = Omit<LensPartitionVisualizationState, 'layers'> & {
    layers: DeprecatedLegendValueLayer[];
};
export declare function convertPartitionToLegendStats(state: DeprecatedLegendValueLensPartitionVisualizationState | LensPartitionVisualizationState): LensPartitionVisualizationState | DeprecatedLegendValueLensPartitionVisualizationState;
export {};
