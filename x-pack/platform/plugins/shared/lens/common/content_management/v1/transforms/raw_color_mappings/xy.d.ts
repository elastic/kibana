import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { XYLayerConfig, XYVisualizationState } from '../../../../../public';
import { type DeprecatedColorMappingConfig } from './common';
import type { DeprecatedSplitAccessorLayer } from '../../../v2/transforms/split_accessors/xy';
/** @deprecated */
interface DeprecatedColorMappingLayer extends Omit<DeprecatedSplitAccessorLayer, 'colorMapping'> {
    colorMapping: DeprecatedColorMappingConfig;
}
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingsXYState extends Omit<XYVisualizationState, 'layers'> {
    layers: Array<DeprecatedColorMappingLayer | XYLayerConfig>;
}
export declare const convertXYToRawColorMappings: (state: XYVisualizationState | DeprecatedColorMappingsXYState, datasourceStates?: Readonly<GeneralDatasourceStates>) => XYVisualizationState;
export {};
