import type { LayerType as XYLayerType } from '@kbn/expression-xy-plugin/common';
import type { AxesSettingsConfig, DatasourceLayers, FramePublicAPI, OperationMetadata, UserMessage, VisualizationType } from '@kbn/lens-common';
import { LENS_LAYER_TYPES as layerTypes } from '@kbn/lens-common';
import type { XYVisualizationState, XYAnnotationLayerConfig, XYLayerConfig, XYDataLayerConfig, XYReferenceLineLayerConfig, SeriesType, XYByReferenceAnnotationLayerConfig, XYByValueAnnotationLayerConfig } from './types';
import type { ExtraAppendLayerArg } from './visualization';
export declare function getAxisName(axis: 'x' | 'y' | 'yLeft' | 'yRight', { isHorizontal }: {
    isHorizontal: boolean;
}): string;
export declare function checkXAccessorCompatibility(state: XYVisualizationState, datasourceLayers: DatasourceLayers): {
    shortMessage: string;
    longMessage: string;
}[];
export declare function checkScaleOperation(scaleType: 'ordinal' | 'interval' | 'ratio', dataType: 'date' | 'number' | 'string' | undefined, datasourceLayers: DatasourceLayers): (layer: XYDataLayerConfig) => boolean;
/**
 * Checks if an operation is a date histogram (date type with interval scale).
 */
export declare function isDateHistogramOperation(operation: OperationMetadata | null | undefined): boolean;
/**
 * Returns recommended X-axis title visibility settings based on the operation type.
 *
 * - Date histogram: recommends "None" (redundant info - timestamp per bucket shown in chart)
 * - Non-date histogram: recommends "Auto" (axis label is useful)
 * - Respects user's manual choice (e.g., if user set Auto on date histogram, keeps it)
 * - Preserves custom title settings (if xTitle is set, don't change visibility)
 *
 * @returns Updated settings if a change is recommended, undefined otherwise
 */
export declare function getRecommendedXAxisTitleVisibility(currentSettings: AxesSettingsConfig | undefined, operation: OperationMetadata | null | undefined, xTitle: string | undefined): AxesSettingsConfig | undefined;
export declare const isDataLayer: (layer: XYLayerConfig) => layer is XYDataLayerConfig;
export declare const getDataLayers: (layers: XYLayerConfig[]) => XYDataLayerConfig[];
export declare const getFirstDataLayer: (layers: XYLayerConfig[]) => XYDataLayerConfig | undefined;
export declare const isReferenceLayer: (layer: Pick<XYLayerConfig, "layerType">) => layer is XYReferenceLineLayerConfig;
export declare const getReferenceLayers: (layers: Array<Pick<XYLayerConfig, "layerType">>) => XYReferenceLineLayerConfig[];
export declare const isAnnotationsLayer: (layer: Pick<XYLayerConfig, "layerType">) => layer is XYAnnotationLayerConfig;
export declare const isByReferenceAnnotationsLayer: (layer: XYLayerConfig) => layer is XYByReferenceAnnotationLayerConfig;
export declare const getAnnotationsLayers: (layers: Array<Pick<XYLayerConfig, "layerType">>) => XYAnnotationLayerConfig[];
export declare const getGroupMetadataFromAnnotationLayer: (layer: XYAnnotationLayerConfig) => {
    title: string;
    description: string;
    tags: string[];
};
export declare const getAnnotationLayerTitle: (layer: XYAnnotationLayerConfig) => string;
export interface LayerTypeToLayer {
    [layerTypes.DATA]: (layer: XYDataLayerConfig) => XYDataLayerConfig;
    [layerTypes.REFERENCELINE]: (layer: XYReferenceLineLayerConfig) => XYReferenceLineLayerConfig;
    [layerTypes.ANNOTATIONS]: (layer: XYAnnotationLayerConfig) => XYAnnotationLayerConfig;
}
export declare const getLayerTypeOptions: (layer: XYLayerConfig, options: LayerTypeToLayer) => XYDataLayerConfig | XYReferenceLineLayerConfig | XYByValueAnnotationLayerConfig;
export declare function getVisualizationSubtypeId(state: XYVisualizationState): string;
export declare function getVisualizationType(state: XYVisualizationState, layerId?: string): VisualizationType | 'mixed';
export declare function getDescription(state?: XYVisualizationState, layerId?: string): {
    icon: import("@elastic/eui/src/components/icon/icon").IconType | ((props: Omit<import("@elastic/eui/src/components/icon/icon").EuiIconProps, "type">) => import("react").JSX.Element);
    label: string;
};
export declare const defaultIcon: (props: Omit<import("@elastic/eui/src/components/icon/icon").EuiIconProps, "type">) => import("react").JSX.Element;
export declare const supportedDataLayer: {
    type: "data";
    label: string;
    icon: (props: Omit<import("@elastic/eui/src/components/icon/icon").EuiIconProps, "type">) => import("react").JSX.Element;
};
export declare function newLayerState({ layerId, layerType, seriesType, indexPatternId, extraArg, }: {
    layerId: string;
    layerType?: XYLayerType;
    seriesType: SeriesType;
    indexPatternId: string;
    extraArg?: ExtraAppendLayerArg;
}): XYDataLayerConfig | XYReferenceLineLayerConfig | XYByValueAnnotationLayerConfig;
export declare function getLayersByType(state: XYVisualizationState, byType?: string): XYLayerConfig[];
export declare function validateLayersForDimension(dimension: 'y' | 'break_down', allLayers: XYLayerConfig[], missingCriteria: (layer: XYDataLayerConfig) => boolean): {
    valid: true;
} | {
    valid: false;
    error: UserMessage;
};
export declare const isNumericMetric: (op: OperationMetadata) => boolean;
export declare const isNumericDynamicMetric: (op: OperationMetadata) => boolean;
export declare const isBucketed: (op: OperationMetadata) => boolean;
export declare const isTimeChart: (dataLayers: XYDataLayerConfig[], frame?: Pick<FramePublicAPI, "datasourceLayers"> | undefined) => boolean;
