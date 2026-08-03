import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
export declare const TOTAL_FIELDS_LIMIT_SETTING = "index.mapping.total_fields.limit";
export declare const TOTAL_FIELDS_IGNORE_DYNAMIC_BEYOND_LIMIT_SETTING = "index.mapping.total_fields.ignore_dynamic_beyond_limit";
export declare const getTotalFieldsLimitFromSettings: (settings: IndicesIndexSettings | undefined) => number | undefined;
export declare const getIgnoreDynamicBeyondLimitFromSettings: (settings: IndicesIndexSettings | undefined) => boolean | undefined;
export declare const getTotalFieldsLimitSettings: (limit: number) => IndicesIndexSettings;
export interface TotalFieldsLimitEvaluation {
    isSatisfied: boolean;
    effectiveLimit: number;
}
export declare const evaluateTotalFieldsLimit: (allSettings: Array<IndicesIndexSettings | undefined>, requestedLimit: number) => TotalFieldsLimitEvaluation;
