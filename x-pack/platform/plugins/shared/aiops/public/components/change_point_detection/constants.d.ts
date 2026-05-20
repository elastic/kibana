export declare const fnOperationTypeMapping: Record<string, string>;
export declare const DEFAULT_AGG_FUNCTION = "avg";
export declare const SPLIT_FIELD_CARDINALITY_LIMIT = 10000;
export declare const COMPOSITE_AGG_SIZE = 500;
export declare const CHANGE_POINT_TYPES: {
    readonly DIP: "dip";
    readonly SPIKE: "spike";
    readonly DISTRIBUTION_CHANGE: "distribution_change";
    readonly STEP_CHANGE: "step_change";
    readonly TREND_CHANGE: "trend_change";
    readonly STATIONARY: "stationary";
    readonly NON_STATIONARY: "non_stationary";
    readonly INDETERMINABLE: "indeterminable";
};
export type ChangePointType = (typeof CHANGE_POINT_TYPES)[keyof typeof CHANGE_POINT_TYPES];
export declare const EXCLUDED_CHANGE_POINT_TYPES: Set<ChangePointType>;
export declare const MAX_CHANGE_POINT_CONFIGS = 6;
export declare const CHANGE_POINT_DETECTION_EVENT: {
    readonly RUN: "ran_aiops_change_point_detection";
    readonly SUCCESS: "aiops_change_point_detection_success";
    readonly ERROR: "aiops_change_point_detection_error";
};
