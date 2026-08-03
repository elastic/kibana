import type { FramePublicAPI, Visualization } from '@kbn/lens-common';
import type { XYVisualizationState, XYDataLayerConfig, XYAnnotationLayerConfig, XYLayerConfig } from '../types';
export declare const defaultAnnotationLabel: string;
export declare const defaultRangeAnnotationLabel: string;
export declare function getStaticDate(dataLayers: XYDataLayerConfig[], frame: FramePublicAPI): string;
export declare const getAnnotationsSupportedLayer: (state?: XYVisualizationState, frame?: Pick<FramePublicAPI, "datasourceLayers" | "activeData">) => {
    type: "annotations";
    label: string;
    icon: (props: Omit<import("@elastic/eui/src/components/icon/icon").EuiIconProps, "type">) => import("react").JSX.Element;
    disabled: boolean;
    toolTipContent: string | undefined;
    initialDimensions: {
        groupId: string;
        columnId: string;
    }[] | undefined;
    noDatasource: boolean;
};
export declare const onAnnotationDrop: Visualization<XYVisualizationState>['onDrop'];
export declare const setAnnotationsDimension: Visualization<XYVisualizationState>['setDimension'];
export declare const getAnnotationsAccessorColorConfig: (layer: XYAnnotationLayerConfig, isDarkMode?: boolean) => import("@kbn/visualization-ui-components").AccessorConfig[];
export declare const getAnnotationsConfiguration: ({ state, frame, layer, isDarkMode, }: {
    state: XYVisualizationState;
    frame: Pick<FramePublicAPI, "datasourceLayers">;
    layer: XYAnnotationLayerConfig;
    isDarkMode?: boolean;
}) => {
    groups: {
        groupId: string;
        groupLabel: string;
        dimensionEditorGroupLabel: string;
        accessors: import("@kbn/visualization-ui-components").AccessorConfig[];
        dataTestSubj: string;
        requiredMinDimensionCount: number;
        supportsMoreColumns: boolean;
        supportFieldFormat: boolean;
        enableDimensionEditor: boolean;
        filterOperations: () => boolean;
    }[];
};
export declare const getUniqueLabels: (layers: XYLayerConfig[]) => Record<string, string>;
