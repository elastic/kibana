/**
 * This is an internal hard coded feature flag so we can easily turn on/off the
 * "Change Point Detection UI" during development until the first release.
 */
export declare const CHANGE_POINT_DETECTION_ENABLED = true;
export declare const EMBEDDABLE_CHANGE_POINT_CHART_TYPE: "aiops_change_point_chart";
export declare const CHANGE_POINT_CHART_DATA_VIEW_REF_NAME = "aiopsChangePointChartDataViewId";
export type EmbeddableChangePointType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;
export declare const CHANGE_POINT_DETECTION_VIEW_TYPE: {
    readonly CHARTS: "charts";
    readonly TABLE: "table";
};
export type ChangePointDetectionViewType = (typeof CHANGE_POINT_DETECTION_VIEW_TYPE)[keyof typeof CHANGE_POINT_DETECTION_VIEW_TYPE];
