export declare const URL_TYPE: {
    KIBANA_DASHBOARD: string;
    KIBANA_DISCOVER: string;
    OTHER: string;
};
export declare const TIME_RANGE_TYPE: {
    readonly AUTO: "auto";
    readonly INTERVAL: "interval";
};
export type TimeRangeType = (typeof TIME_RANGE_TYPE)[keyof typeof TIME_RANGE_TYPE];
