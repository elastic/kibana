import type { Reference } from '@kbn/content-management-utils';
import { type AnnotationGroups, type XYPersistedLayerConfig, type XYPersistedState } from '@kbn/lens-common';
import type { XYVisualizationState } from './types';
/**
 * Converts persisted state to runtime state.
 *
 * Injects references to produce a fully formed XYVisualizationState that can be used by the visualization.
 */
export declare function convertPersistedState(state: XYPersistedState, annotationGroups?: AnnotationGroups, references?: Reference[]): XYVisualizationState;
/**
 * Converts runtime state to persisted state.
 *
 * @param state The runtime XYVisualizationState to convert.
 * @returns An object containing the persistable state and any references.
 */
export declare function convertToPersistable(state: XYVisualizationState): {
    references: Reference[];
    state: {
        layers: XYPersistedLayerConfig[];
        legend: import("@kbn/expression-xy-plugin/common").LegendConfig;
        fillOpacity?: number | undefined;
        minBarHeight?: number | undefined;
        curveType?: import("@kbn/expression-xy-plugin/common").XYCurveType | undefined;
        labelsOrientation?: import("@kbn/lens-common").LabelsOrientationConfig | undefined;
        preferredSeriesType: import("@kbn/lens-common").SeriesType;
        valueLabels?: import("@kbn/lens-common").ValueLabelConfig | undefined;
        fittingFunction?: import("@kbn/expression-xy-plugin/common").FittingFunction | undefined;
        emphasizeFitting?: boolean | undefined;
        endValue?: import("@kbn/expression-xy-plugin/common").EndValue | undefined;
        xExtent?: import("@kbn/expression-xy-plugin/common").AxisExtentConfig | undefined;
        yLeftExtent?: import("@kbn/expression-xy-plugin/common").AxisExtentConfig | undefined;
        yRightExtent?: import("@kbn/expression-xy-plugin/common").AxisExtentConfig | undefined;
        xTitle?: string | undefined;
        yTitle?: string | undefined;
        yRightTitle?: string | undefined;
        yLeftScale?: import("@kbn/expression-xy-plugin/common").YScaleType | undefined;
        yRightScale?: import("@kbn/expression-xy-plugin/common").YScaleType | undefined;
        axisTitlesVisibilitySettings?: import("@kbn/lens-common").AxesSettingsConfig | undefined;
        tickLabelsVisibilitySettings?: import("@kbn/lens-common").AxesSettingsConfig | undefined;
        gridlinesVisibilitySettings?: import("@kbn/lens-common").AxesSettingsConfig | undefined;
        hideEndzones?: boolean | undefined;
        showCurrentTimeMarker?: boolean | undefined;
        pointVisibility?: import("@kbn/expression-xy-plugin/common").PointVisibility | undefined;
        valuesInLegend?: boolean;
    };
};
