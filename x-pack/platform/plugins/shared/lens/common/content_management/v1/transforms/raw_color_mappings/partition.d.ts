import type { GeneralDatasourceStates, LensPartitionLayerState, LensPartitionVisualizationState } from '@kbn/lens-common';
import { type DeprecatedColorMappingConfig } from './common';
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
    layers: Array<LensPartitionLayerState | DeprecatedColorMappingLayer>;
}
export declare const convertPieToRawColorMappings: (state: LensPartitionVisualizationState | DeprecatedColorMappingLensPartitionVisualizationState, datasourceStates?: Readonly<GeneralDatasourceStates>) => LensPartitionVisualizationState;
export {};
