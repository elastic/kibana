import type { LensPartitionLayerState, LensPartitionVisualizationState, GeneralDatasourceStates } from '@kbn/lens-common';
import type { DeprecatedColorMappingConfig } from '../../../../runtime_state/converters/raw_color_mappings';
/** @deprecated */
interface DeprecatedColorMappingLayer extends Omit<LensPartitionLayerState, 'colorMapping'> {
    colorMapping: DeprecatedColorMappingConfig;
}
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingLensPartitionVisualizationState extends Omit<LensPartitionVisualizationState, 'layers'> {
    layers: Array<DeprecatedColorMappingLayer | LensPartitionLayerState>;
}
export declare const convertToRawColorMappingsFn: (datasourceStates?: Readonly<GeneralDatasourceStates>) => (state: DeprecatedColorMappingLensPartitionVisualizationState | LensPartitionVisualizationState) => LensPartitionVisualizationState;
export {};
