import type { DatatableColumn } from '@kbn/expressions-plugin/common';
export declare const EMPTY_VALUE = "\u2014";
export declare const ALERT_EVENTS_DATA_STREAM = ".rule-events";
export declare const ALERT_ACTIONS_DATA_STREAM = ".alert-actions";
export declare const LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE = "lastEpisodeTimestamp";
export declare const PAGE_SIZE_ESQL_VARIABLE = "pageSize";
export declare const RELATED_ALERT_EPISODES_PAGE_SIZE = 5;
/** Max episodes returned per list page (ESQL LIMIT) and max unique rules resolved in one batch. */
export declare const ALERT_EPISODES_LIST_PAGE_SIZE = 1000;
export declare const QUERY_STALE_TIME = 30000;
export declare const TIME_FIELD = "@timestamp";
/**
 * Fields produced by buildEpisodesHistogramQuery that are valid as breakdown dimensions.
 * Passed as esqlColumns to UnifiedBreakdownFieldSelector to restrict the picker to only
 * fields the episode pipeline actually fetches.
 */
export declare const HISTOGRAM_BREAKDOWN_COLUMNS: DatatableColumn[];
export declare const HISTOGRAM_EPISODE_LIMIT = 10000;
export declare const DEFAULT_DATE_FORMAT = "MMM D, YYYY @ HH:mm:ss.SSS";
export declare const FLYOUT_FOOTER_OFFSET = 80;
export declare const ALERTING_V2_RULES_BASE_PATH = "/app/management/alertingV2/rules";
export declare const ALERTING_V2_EPISODES_BASE_PATH = "/app/management/alertingV2/episodes";
export declare const getAlertEpisodeDetailsPath: (episodeId: string) => string;
export declare const getRuleDetailsPath: (ruleId: string) => string;
