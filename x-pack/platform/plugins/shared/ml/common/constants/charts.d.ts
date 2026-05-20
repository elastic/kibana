export declare const CHART_TYPE: {
    readonly EVENT_DISTRIBUTION: "event_distribution";
    readonly POPULATION_DISTRIBUTION: "population_distribution";
    readonly SINGLE_METRIC: "single_metric";
    readonly GEO_MAP: "geo_map";
};
export type ChartType = (typeof CHART_TYPE)[keyof typeof CHART_TYPE];
export declare const SCHEDULE_EVENT_MARKER_ENTITY = "schedule_event_marker_entity";
