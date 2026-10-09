/**
 * Name of the datastream in elasticsearch
 */
export declare const DATA_STREAM_NAME = ".kibana_change_history";
/**
 * Separator char. Used for scoping.
 */
export declare const SEPARATOR_CHAR = "|";
/**
 * The version of ECS used
 * @see https://www.elastic.co/docs/reference/ecs/ecs-field-reference
 */
export declare const ECS_VERSION = "9.3.0";
/**
 * The default size of results when getting history.
 */
export declare const DEFAULT_RESULT_SIZE = 100;
/**
 * Default maximum number of buckets returned per field by {@link ChangeHistoryClient.getHistoryByFields}.
 */
export declare const DEFAULT_FIELD_AGGREGATION_SIZE = 100;
/**
 * Acts like a feature flag for this package as it prevents initialization.
 * Remove this after General Availability
 * */
export declare const FLAGS: {
    FEATURE_ENABLED: boolean;
};
