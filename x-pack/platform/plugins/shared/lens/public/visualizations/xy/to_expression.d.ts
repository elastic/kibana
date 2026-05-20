import type { Ast } from '@kbn/interpreter';
import { ScaleType } from '@elastic/charts';
import { type PaletteRegistry } from '@kbn/coloring';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { OperationMetadata, DatasourcePublicAPI, DatasourceLayers } from '@kbn/lens-common';
import type { XYVisualizationState, XYDataLayerConfig, XYReferenceLineLayerConfig, XYLayerConfig } from './types';
type XYLayerConfigWithSimpleView = XYLayerConfig & {
    simpleView?: boolean;
};
type State = Omit<XYVisualizationState, 'layers'> & {
    layers: XYLayerConfigWithSimpleView[];
};
export declare const getSortedAccessors: (datasource: DatasourcePublicAPI | undefined, layer: XYDataLayerConfig | XYReferenceLineLayerConfig) => string[];
export declare const toExpression: (state: State, datasourceLayers: DatasourceLayers, paletteService: PaletteRegistry, datasourceExpressionsByLayers: Record<string, Ast>, eventAnnotationService: EventAnnotationServiceType) => Ast | null;
export declare function toPreviewExpression(state: State, datasourceLayers: DatasourceLayers, paletteService: PaletteRegistry, datasourceExpressionsByLayers: Record<string, Ast>, eventAnnotationService: EventAnnotationServiceType): Ast | null;
export declare function getScaleType(metadata: OperationMetadata | null, defaultScale: ScaleType): ScaleType;
export declare const buildXYExpression: (state: State, metadata: Record<string, Record<string, OperationMetadata | null>>, datasourceLayers: DatasourceLayers, paletteService: PaletteRegistry, datasourceExpressionsByLayers: Record<string, Ast>, eventAnnotationService: EventAnnotationServiceType) => Ast | null;
export {};
