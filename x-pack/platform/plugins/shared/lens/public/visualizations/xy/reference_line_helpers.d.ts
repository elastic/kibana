import type { Datatable } from '@kbn/expressions-plugin/public';
import type { AccessorConfig } from '@kbn/visualization-ui-components';
import type { DatasourceLayers, FramePublicAPI, Visualization } from '@kbn/lens-common';
import type { XYVisualizationState, XYDataLayerConfig, XYReferenceLineLayerConfig, YConfig } from './types';
export interface ReferenceLineBase {
    label: 'x' | 'yRight' | 'yLeft';
}
/**
 * Return the reference layers groups to show based on multiple criteria:
 * * what groups are current defined in data layers
 * * what existing reference line are currently defined in reference layers
 */
export declare function getGroupsToShow<T extends ReferenceLineBase & {
    config?: YConfig[];
}>(referenceLayers: T[], state: XYVisualizationState | undefined, datasourceLayers: DatasourceLayers, tables: Record<string, Datatable> | undefined): Array<T & {
    valid: boolean;
}>;
/**
 * Returns the reference layers groups to show based on what groups are current defined in data layers.
 */
export declare function getGroupsRelatedToData<T extends ReferenceLineBase>(referenceLayers: T[], state: XYVisualizationState | undefined, datasourceLayers: DatasourceLayers, tables: Record<string, Datatable> | undefined): T[];
/**
 * Returns a dictionary with the groups filled in all the data layers
 */
export declare function getGroupsAvailableInData(dataLayers: XYDataLayerConfig[], datasourceLayers: DatasourceLayers, tables: Record<string, Datatable> | undefined): {
    x: boolean;
    yLeft: boolean;
    yRight: boolean;
};
export declare function getStaticValue(dataLayers: XYDataLayerConfig[], groupId: 'x' | 'yLeft' | 'yRight', { activeData }: Pick<FramePublicAPI, 'activeData'>, layerHasNumberHistogram: (layer: XYDataLayerConfig) => boolean): number;
export declare function computeOverallDataDomain(dataLayers: XYDataLayerConfig[], accessorIds: string[], activeData: NonNullable<FramePublicAPI['activeData']>, allowStacking?: boolean): {
    min: number | undefined;
    max: number | undefined;
};
export declare const getReferenceSupportedLayer: (state?: XYVisualizationState, frame?: Pick<FramePublicAPI, "datasourceLayers" | "activeData">) => {
    type: "referenceLine";
    label: string;
    icon: ({ title, titleId, ...props }: Omit<import("@elastic/eui/src/components/icon/icon").EuiIconProps, "type">) => import("react").JSX.Element;
    disabled: boolean;
    toolTipContent: string | undefined;
    initialDimensions: {
        groupId: string;
        columnId: string;
        dataType: string;
        label: string;
        staticValue: number;
    }[] | undefined;
};
export declare const setReferenceDimension: Visualization<XYVisualizationState>['setDimension'];
export declare const getSingleColorConfig: (id: string, color?: string, icon?: string) => AccessorConfig;
export declare const getReferenceLineAccessorColorConfig: (layer: XYReferenceLineLayerConfig) => AccessorConfig[];
export declare const getReferenceConfiguration: ({ state, frame, layer, sortedAccessors, }: {
    state: XYVisualizationState;
    frame: Pick<FramePublicAPI, "activeData" | "datasourceLayers">;
    layer: XYReferenceLineLayerConfig;
    sortedAccessors: string[];
}) => {
    groups: {
        groupId: string;
        groupLabel: string;
        dimensionEditorGroupLabel: string;
        accessors: AccessorConfig[];
        filterOperations: (op: import("@kbn/lens-common").OperationMetadata) => boolean;
        supportsMoreColumns: boolean;
        requiredMinDimensionCount: number;
        enableDimensionEditor: boolean;
        supportStaticValue: boolean;
        paramEditorCustomProps: {
            labels: string[];
            headingLabel: string;
        };
        supportFieldFormat: boolean;
        dataTestSubj: string;
        invalid: boolean;
        invalidMessage: string;
        requiresPreviousColumnOnDuplicate: boolean;
    }[];
};
