export declare const COMMENT_ATTACHMENT_TYPE = "comment";
export declare const SECURITY_EVENT_ATTACHMENT_TYPE = "security.event";
export declare const SECURITY_ALERT_ATTACHMENT_TYPE = "security.alert";
export declare const OBSERVABILITY_ALERT_ATTACHMENT_TYPE = "observability.alert";
export declare const STACK_ALERT_ATTACHMENT_TYPE = "stack.alert";
export declare const SECURITY_ENDPOINT_ATTACHMENT_TYPE = "security.endpoint";
export declare const FILE_ATTACHMENT_TYPE = "file";
export declare const LENS_ATTACHMENT_TYPE = "lens";
export declare const OSQUERY_ATTACHMENT_TYPE = "osquery";
export declare const INDICATOR_ATTACHMENT_TYPE = "security.indicator";
export declare const SECURITY_ENTITY_ATTACHMENT_TYPE = "security.entity";
export declare const SECURITY_TIMELINE_ATTACHMENT_TYPE = "security.timeline";
export declare const ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE = "ml.anomaly_swimlane";
export declare const ML_ANOMALY_CHARTS_ATTACHMENT_TYPE = "ml.anomaly_charts";
export declare const ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE = "ml.single_metric_viewer";
export declare const AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE = "aiops.change_point_chart";
export declare const AIOPS_PATTERN_ANALYSIS_ATTACHMENT_TYPE = "aiops.pattern_analysis";
export declare const AIOPS_LOG_RATE_ANALYSIS_ATTACHMENT_TYPE = "aiops.log_rate_analysis";
export declare const DASHBOARD_ATTACHMENT_TYPE = "dashboard";
export declare const DISCOVER_SESSION_ATTACHMENT_TYPE = "discoverSession";
export declare const MAP_ATTACHMENT_TYPE = "map";
/**
 * Saved-object type identifiers as understood by core saved-objects and the
 * management `_find` API.
 */
export declare const DASHBOARD_SO_TYPE = "dashboard";
export declare const LENS_SO_TYPE = "lens";
export declare const MAP_SO_TYPE = "map";
export declare const DISCOVER_SESSION_SO_TYPE = "search";
export declare const LEGACY_ACTIONS_TYPE = "actions";
export declare const LEGACY_ALERT_TYPE = "alert";
export declare const LEGACY_EVENT_TYPE = "event";
export declare const LEGACY_EXTERNAL_REFERENCE_TYPE = "externalReference";
export declare const LEGACY_PERSISTABLE_STATE_TYPE = "persistableState";
export declare const LEGACY_USER_TYPE = "user";
export declare const LEGACY_FILE_ATTACHMENT_TYPE = ".files";
export declare const LEGACY_INDICATOR_ATTACHMENT_TYPE = "indicator";
export declare const LEGACY_LENS_ATTACHMENT_TYPE = ".lens";
export declare const LEGACY_ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE = "ml_anomaly_swimlane";
export declare const LEGACY_ML_ANOMALY_CHARTS_ATTACHMENT_TYPE = "ml_anomaly_charts";
export declare const LEGACY_ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE = "ml_single_metric_viewer";
export declare const LEGACY_AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE = "aiopsChangePointChart";
export declare const LEGACY_AIOPS_PATTERN_ANALYSIS_ATTACHMENT_TYPE = "aiopsPatternAnalysisEmbeddable";
export declare const LEGACY_AIOPS_LOG_RATE_ANALYSIS_ATTACHMENT_TYPE = "aiopsLogRateAnalysisEmbeddable";
/**
 * Mapping from legacy externalReferenceAttachmentTypeId to unified type name.
 * Used by the generic externalReference transformer to resolve the unified type.
 */
export declare const EXTERNAL_REFERENCE_TYPE_MAP: Record<string, string>;
export declare const LEGACY_ATTACHMENT_TYPES: Set<string>;
export declare const UNIFIED_ATTACHMENT_TYPES: Set<string>;
export declare const PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP: Record<string, string>;
export declare const PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP: Record<string, string>;
export declare const PERSISTABLE_ATTACHMENT_TYPES: Set<string>;
/**
 * Mapping from legacy attachment type names to unified names.
 */
export declare const LEGACY_TO_UNIFIED_MAP: Record<string, string>;
/**
 * Reverse mapping from unified names to legacy names.
 */
export declare const UNIFIED_TO_LEGACY_MAP: Record<string, string>;
/**
 * Reverse mapping from unified type name back to externalReferenceAttachmentTypeId.
 */
export declare const UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP: Record<string, string>;
/**
 * Attachment type identifiers that are migrated to unified read/write behavior.
 */
export declare const MIGRATED_ATTACHMENT_TYPES: Set<string>;
export declare const OWNER_TO_PREFIX_MAP: Partial<Record<string, string>>;
export declare const PREFIX_TO_OWNER_MAP: Partial<Record<string, string>>;
/**
 * Registers an owner→prefix mapping so the owner's legacy `alert`/`event`
 * attachments resolve to a valid unified type (e.g. `security.alert`). For
 * dynamically registered owners (e.g. FTR fixtures); built-in solutions are
 * seeded in {@link OWNER_TO_PREFIX_MAP}. Only the forward map is updated —
 * `PREFIX_TO_OWNER_MAP` must stay unambiguous when owners share a prefix.
 */
export declare const registerOwnerPrefix: (owner: string, prefix: string) => void;
