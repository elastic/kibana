import type { XYVisualizationState } from '@kbn/lens-common';
type UnwrapArray<T> = T extends Array<infer P> ? P : T;
export declare function updateLayer(state: XYVisualizationState, layer: UnwrapArray<XYVisualizationState['layers']>, index: number): XYVisualizationState;
export { XyStyleSettings } from './style_settings';
export { XyLegendSettings } from './legend_settings';
