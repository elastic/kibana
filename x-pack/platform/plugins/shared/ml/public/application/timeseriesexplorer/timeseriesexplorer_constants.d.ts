export declare const APP_STATE_ACTION: {
    readonly CLEAR: "CLEAR";
    readonly SET_DETECTOR_INDEX: "SET_DETECTOR_INDEX";
    readonly SET_ENTITIES: "SET_ENTITIES";
    readonly SET_FORECAST_ID: "SET_FORECAST_ID";
    readonly SET_ZOOM: "SET_ZOOM";
    readonly UNSET_ZOOM: "UNSET_ZOOM";
    readonly SET_FUNCTION_DESCRIPTION: "SET_FUNCTION_DESCRIPTION";
};
export type TimeseriesexplorerActionType = (typeof APP_STATE_ACTION)[keyof typeof APP_STATE_ACTION];
export declare const CHARTS_POINT_TARGET = 500;
export declare const MAX_SCHEDULED_EVENTS = 10;
export declare const TIME_FIELD_NAME = "timestamp";
