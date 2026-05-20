export declare const FILTER_ACTION: {
    readonly ADD: "+";
    readonly REMOVE: "-";
};
export type FilterAction = (typeof FILTER_ACTION)[keyof typeof FILTER_ACTION];
export declare const CHART_TYPE: {
    readonly EVENT_DISTRIBUTION: "event_distribution";
    readonly POPULATION_DISTRIBUTION: "population_distribution";
    readonly SINGLE_METRIC: "single_metric";
    readonly GEO_MAP: "geo_map";
};
export type ChartType = (typeof CHART_TYPE)[keyof typeof CHART_TYPE];
export declare const MAX_CATEGORY_EXAMPLES = 10;
/**
 * Maximum amount of top influencer to fetch.
 */
export declare const MAX_INFLUENCER_FIELD_VALUES = 10;
export declare const MAX_INFLUENCER_FIELD_NAMES = 50;
export declare const VIEW_BY_JOB_LABEL: string;
export declare const OVERALL_LABEL: string;
/**
 * Default page size for the anomaly swim lane.
 */
export declare const SWIM_LANE_DEFAULT_PAGE_SIZE = 10;
