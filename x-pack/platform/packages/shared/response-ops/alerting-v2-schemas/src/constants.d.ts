/** Maximum number of consecutive breaches before transition */
export declare const MAX_CONSECUTIVE_BREACHES = 1000;
/** Maximum allowed duration for schedule and timeframe fields */
export declare const MAX_DURATION = "365d";
/** Minimum allowed interval for schedule.every */
export declare const MIN_SCHEDULE_INTERVAL = "5s";
/** Maximum rules processed in one filter-based bulk operation (select-all). */
export declare const BULK_FILTER_MAX_RULES = 10000;
/**
 * Maximum length for entity identifiers (rule, action policy, episode, insight,
 * workflow connector). Aligned with other Kibana saved-object identifier limits.
 */
export declare const ID_MAX_LENGTH = 150;
/** Maximum length for KQL/filter query strings (e.g. action policy matcher, bulk operation filter). */
export declare const MAX_KQL_LENGTH = 4096;
/** Maximum length for an Elasticsearch field name (e.g. `host.name`, `service.environment`). */
export declare const MAX_FIELD_NAME_LENGTH = 256;
/** Maximum number of fields used to group alerts (rule grouping, action policy groupBy). */
export declare const MAX_GROUPING_FIELDS = 16;
/** Maximum number of items processed in a single bulk-action request body. */
export declare const MAX_BULK_ITEMS = 100;
/** Maximum length for human-readable name fields (rule name, action policy name). */
export declare const MAX_NAME_LENGTH = 256;
/** Maximum length for human-readable description fields (rule description, action policy description). */
export declare const MAX_DESCRIPTION_LENGTH = 1024;
