/** Maximum number of consecutive breaches before transition */
export declare const MAX_CONSECUTIVE_BREACHES = 1000;
export declare const MAX_ESQL_QUERY_LENGTH = 10000;
/** Maximum allowed duration for schedule and timeframe fields */
export declare const MAX_DURATION = "365d";
/**
 * Maximum length of a duration string. The longest value {@link MAX_DURATION}
 * admits is 13 characters (`31536000000ms`); the headroom is deliberate.
 */
export declare const MAX_DURATION_LENGTH = 32;
/** Minimum allowed interval for schedule.every */
export declare const MIN_SCHEDULE_INTERVAL = "5s";
/**
 * Default value of `xpack.alerting_v2.rules.minimumScheduleInterval`. Shared
 * between the server config (as its `defaultValue`) and the rule form UI so the
 * client validates `schedule.every` against the same minimum the server enforces
 * on a default deployment.
 */
export declare const DEFAULT_MINIMUM_SCHEDULE_INTERVAL = "1m";
/** Maximum resources processed in one filter-based bulk operation (select-all). */
export declare const BULK_FILTER_MAX_RESOURCES = 10000;
/**
 * Maximum length for entity identifiers (rule, action policy, episode, insight,
 * workflow connector). Aligned with other Kibana saved-object identifier limits.
 */
export declare const ID_MAX_LENGTH = 150;
/** Maximum length for KQL/filter query strings (e.g. action policy matcher, bulk operation filter). */
export declare const MAX_KQL_LENGTH = 4096;
/** Maximum length for free-text search strings. */
export declare const MAX_SEARCH_LENGTH = 256;
/**
 * Maximum number of rule ids returned in the `sample` array of a by-query
 * bulk operation dry-run response. Large enough for meaningful spot-checks,
 * small enough to keep response payloads bounded.
 */
export declare const BULK_QUERY_SAMPLE_SIZE = 100;
/** Maximum length for an Elasticsearch field name (e.g. `host.name`, `service.environment`). */
export declare const MAX_FIELD_NAME_LENGTH = 256;
/** Maximum number of fields used to group alerts (rule grouping, action policy group_by). */
export declare const MAX_GROUPING_FIELDS = 16;
/** Maximum number of items processed in a single bulk-action request body. */
export declare const MAX_BULK_ITEMS = 100;
/** Maximum length for human-readable name fields (rule name, action policy name). */
export declare const MAX_NAME_LENGTH = 256;
/**
 * Maximum length for episode attachment display labels (`episode.label`).
 * Sized for `{ruleName} alert for {groupName}` where each name is at most
 * {@link MAX_NAME_LENGTH}, plus room for the connecting phrase.
 */
export declare const MAX_EPISODE_LABEL_LENGTH: number;
/** Maximum length for human-readable description fields (rule description, action policy description). */
export declare const MAX_DESCRIPTION_LENGTH = 1024;
/** Maximum length for an external alert `fingerprint`, the caller's own series key. */
export declare const MAX_FINGERPRINT_LENGTH = 1024;
/** Maximum number of fields named in `fingerprint_fields` on external alert ingest. */
export declare const MAX_FINGERPRINT_FIELDS = 10;
/** Maximum number of keys in the open `data` bag on external alert ingest. */
export declare const MAX_ALERT_EVENT_DATA_KEYS = 100;
/**
 * Maximum number of fields in an artifact's `data` record. Well above what any
 * artifact type needs today, but it keeps the record bounded so the per-field
 * limits cannot be sidestepped by sending many small fields instead of one
 * large one.
 */
export declare const MAX_ARTIFACT_DATA_FIELDS = 32;
/**
 * Maximum length of an artifact's `data` record once JSON-serialized. This is
 * the envelope ceiling for every artifact type, registered or not; registered
 * types apply their own, tighter `dataSchema` on top. It must stay above the
 * largest bound any registered type allows so a rollback of the owning plugin
 * cannot fail writes.
 */
export declare const MAX_ARTIFACT_DATA_LENGTH: number;
/** Maximum number of destinations per action policy. */
export declare const ACTION_POLICY_MAX_DESTINATIONS = 10;
/** Maximum number of items any list endpoint returns per page. */
export declare const MAX_PER_PAGE = 100;
/** Maximum number of execution-history events returned per page (rule + action policy streams). */
export declare const EXECUTION_HISTORY_MAX_PER_PAGE = 100;
/** Default number of execution-history events returned per page when `per_page` is omitted. */
export declare const EXECUTION_HISTORY_DEFAULT_PER_PAGE = 20;
/**
 * Maximum number of events that can be paged through.
 */
export declare const EXECUTION_HISTORY_MAX_RESULT_WINDOW = 10000;
/**
 * Maximum number of rule ids accepted by the execution-history rule-id
 * filter.
 */
export declare const EXECUTION_HISTORY_MAX_RULE_ID_FILTER = 50;
/** Maximum number of rule templates returned per page. */
export declare const RULE_TEMPLATE_MAX_PER_PAGE = 100;
/** Default number of items returned per page by the rule, action policy and rule template list APIs. */
export declare const FIND_DEFAULT_PER_PAGE = 20;
/**
 * Maximum number of items that can be paged through on the rule, action policy
 * and rule template list APIs (`page * per_page`). Mirrors the Elasticsearch
 * default `index.max_result_window`.
 */
export declare const FIND_MAX_RESULT_WINDOW = 10000;
/**
 * Maximum length of the `episode_data` JSON string snapshotted into an episode
 * attachment. Bounds open-ended user JSON so attachment payloads stay finite.
 */
export declare const MAX_EPISODE_DATA_LENGTH = 32000;
/** Maximum number of rule change-history events returned per page. */
export declare const RULE_CHANGE_HISTORY_MAX_PER_PAGE = 100;
/** Default number of rule change-history events returned per page when `per_page` is omitted. */
export declare const RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE = 20;
/**
 * Maximum number of rule change-history events that can be paged through.
 */
export declare const RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW = 10000;
/**
 * Canonical alert event severity levels, ordered from least to most severe.
 */
export declare const SEVERITY_LEVELS: readonly ['info', 'low', 'medium', 'high', 'critical'];
