/** --- Overview list --- */
export declare const OVERVIEW_LIST_SECTION_LOAD_ERROR: string;
export declare const ACTIONS_OVERVIEW_ACKNOWLEDGED_BY: string;
export declare const ACTIONS_OVERVIEW_RESOLVED_BY: string;
export declare const ACTIONS_OVERVIEW_SNOOZED_BY: string;
export declare const ACTIONS_OVERVIEW_SNOOZED_UNTIL: string;
/** --- Flyout --- */
export declare const FLYOUT_ARIA_LABEL: string;
export declare const FLYOUT_TAB_OVERVIEW: string;
export declare const FLYOUT_TAB_RELATED: string;
export declare const FLYOUT_TAB_TIMELINE: string;
export declare const FLYOUT_TAB_METADATA: string;
export declare const FLYOUT_TAB_RUNBOOK: string;
export declare const FLYOUT_VIEW_DETAILS: string;
export declare const FLYOUT_CLOSE: string;
/** --- Header --- */
export declare const HEADER_LOADING_TITLE: string;
export declare const HEADER_EPISODE_TITLE_FALLBACK: string;
/** --- Lifecycle heatmap --- */
export declare const LIFECYCLE_HEATMAP_TITLE: string;
export declare const LIFECYCLE_HEATMAP_EMPTY_TITLE: string;
export declare const LIFECYCLE_HEATMAP_EMPTY_BODY: string;
export declare const LIFECYCLE_HEATMAP_PENDING_STATUS_LABEL: string;
export declare const LIFECYCLE_HEATMAP_ACTIVE_STATUS_LABEL: string;
export declare const LIFECYCLE_HEATMAP_RECOVERING_STATUS_LABEL: string;
export declare const LIFECYCLE_HEATMAP_INACTIVE_STATUS_LABEL: string;
export declare const LIFECYCLE_HEATMAP_UNKNOWN_STATUS_LABEL: string;
/** --- Severity heatmap --- */
export declare const SEVERITY_HEATMAP_TITLE: string;
export declare const SEVERITY_HEATMAP_TOOLTIP_FIELD_COLUMN: string;
export declare const SEVERITY_HEATMAP_TOOLTIP_VALUE_COLUMN: string;
export declare const SEVERITY_HEATMAP_EVENT_DATA_TABLE_CAPTION: string;
export declare const SEVERITY_HEATMAP_CLICK_TO_SEE_DATA: string;
export declare const SEVERITY_HEATMAP_DETAIL_PANEL_CLOSE_ARIA_LABEL: string;
export declare const SEVERITY_HEATMAP_DETAIL_PANEL_EMPTY: string;
/** --- Severity heatmap section --- */
export declare const SEVERITY_HEATMAP_SECTION_LOAD_ERROR: string;
/** --- Timeline heatmaps section --- */
export declare const TIMELINE_HEATMAPS_SECTION_LOAD_ERROR: string;
/** --- Metadata details list --- */
export declare const METADATA_LIST_GROUPING_LABEL: string;
export declare const METADATA_LIST_GROUPING_ERROR: string;
export declare const METADATA_LIST_TRIGGERED_LABEL: string;
export declare const METADATA_LIST_DURATION_LABEL: string;
export declare const METADATA_LIST_ASSIGNEE_LABEL: string;
export declare const METADATA_LIST_TAGS_LABEL: string;
export declare const METADATA_LIST_SOURCE_URL_LABEL: string;
export declare const METADATA_LIST_SOURCE_URL_LINK: string;
export declare const formatMetadataListDuration: (ms: number) => string;
/** --- Metadata section --- */
export declare const METADATA_SECTION_ERROR: string;
export declare const METADATA_SECTION_EMPTY: string;
/** --- Metadata table --- */
export declare const getMetadataTableStaleDataCallout: (timestamp: string) => string;
/** --- Related section --- */
export declare const RELATED_SECTION_LOAD_ERROR: string;
/** --- Rule overview panel --- */
export declare const RULE_OVERVIEW_TITLE: string;
export declare const RULE_OVERVIEW_VIEW_DETAILS: string;
export declare const RULE_OVERVIEW_ENABLED: string;
export declare const RULE_OVERVIEW_DISABLED: string;
/** --- Rule overview panel section --- */
export declare const RULE_OVERVIEW_PANEL_SECTION_ERROR_TITLE: string;
/** --- Runbook --- */
export declare const RUNBOOK_EMPTY: string;
/** --- Runbook section --- */
export declare const RUNBOOK_SECTION_LOAD_ERROR: string;
/** --- Trend chart section --- */
export declare const TREND_CHART_TITLE: string;
export declare const TREND_CHART_LOAD_ERROR: string;
export declare const getTrendChartThresholdComparatorLabel: (metric: string, comparator: string, threshold: number) => string;
