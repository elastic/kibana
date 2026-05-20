import type { XYDataLayerConfig, XYLayerConfig, XYVisualizationState } from '../../../../../public/visualizations/xy/types';
/** @deprecated */
export interface DeprecatedSplitAccessorLayer extends Omit<XYDataLayerConfig, 'splitAccessors'> {
    splitAccessor?: string;
}
/**
 * Deprecated single splitAccessor state
 *
 * @deprecated
 */
export interface DeprecatedSplitAccessorState extends Omit<XYVisualizationState, 'layers'> {
    layers: Array<DeprecatedSplitAccessorLayer | XYLayerConfig>;
}
export declare function convertToSplitAccessorsFn(state: DeprecatedSplitAccessorState | XYVisualizationState): XYVisualizationState;
