import type { DataStreamType, QualityIndicators } from './types';
export declare const DATASET_QUALITY_APP_ID = "dataset_quality";
export declare const DATASET_QUALITY_ALL_SIGNALS_ID = "datasetQuality:all-signals-available";
export declare const DEFAULT_DATASET_TYPE: DataStreamType;
export declare const DEFAULT_LOGS_DATA_VIEW = "logs-*-*";
export declare const DEFAULT_DATASET_QUALITY: QualityIndicators;
export declare const POOR_QUALITY_MINIMUM_PERCENTAGE = 3;
export declare const DEGRADED_QUALITY_MINIMUM_PERCENTAGE = 0;
export declare const DEFAULT_SORT_FIELD = "title";
export declare const DEFAULT_SORT_DIRECTION = "asc";
export declare const DEFAULT_QUALITY_ISSUE_SORT_FIELD = "lastOccurrence";
export declare const DEFAULT_QUALITY_ISSUE_SORT_DIRECTION = "desc";
export declare const DEFAULT_FAILED_DOCS_ERROR_SORT_FIELD = "type";
export declare const DEFAULT_FAILED_DOCS_ERROR_SORT_DIRECTION = "desc";
export declare const NONE = "none";
export declare const DEFAULT_TIME_RANGE: {
    from: string;
    to: string;
};
export declare const DEFAULT_DATEPICKER_REFRESH: {
    value: number;
    pause: boolean;
};
export declare const DEFAULT_QUALITY_DOC_STATS: {
    count: number;
    percentage: number;
};
export declare const NUMBER_FORMAT = "0,0.[000]";
export declare const BYTE_NUMBER_FORMAT = "0.0 b";
export declare const MAX_HOSTS_METRIC_VALUE = 50;
export declare const MAX_DEGRADED_FIELDS = 1000;
export declare const MASKED_FIELD_PLACEHOLDER = "<custom field>";
export declare const UNKOWN_FIELD_PLACEHOLDER = "<unkwon>";
export declare const KNOWN_TYPES: DataStreamType[];
export declare const DEGRADED_DOCS_QUERY = "_ignored: *";
export declare const FAILURE_STORE_SELECTOR = "::failures";
export declare const DATA_SELECTOR = "::data";
export declare const FAILURE_STORE_PRIVILEGE = "read_failure_store";
export declare const MANAGE_FAILURE_STORE_PRIVILEGE = "manage_failure_store";
