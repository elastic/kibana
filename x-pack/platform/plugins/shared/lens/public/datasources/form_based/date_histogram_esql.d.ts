import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import type { DateHistogramIndexPatternColumn, DateRange, IndexPattern } from '@kbn/lens-common';
export declare const AUTO_INTERVAL = "auto";
/** Default date histogram interval when auto cannot be used. */
export declare const DEFAULT_DATE_HISTOGRAM_INTERVAL = "1h";
export declare const hasDateRange: (dateRange: DateRange | undefined) => boolean;
export declare function restrictedInterval(aggregationRestrictions?: Partial<IndexPatternAggRestrictions>): string | undefined;
export declare function getTimeZoneAndInterval(column: DateHistogramIndexPatternColumn, indexPattern: IndexPattern): {
    interval: string;
    timeZone: string | undefined;
    usedField: import("@kbn/lens-common").IndexPatternField;
} | {
    usedField: undefined;
    timeZone: undefined;
    interval: string;
};
