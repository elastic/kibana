import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import type { DateHistogramIndexPatternColumn, DateRange, IndexPattern } from '@kbn/lens-common';
export declare const AUTO_INTERVAL = "auto";
/**
 * Target bucket count for Lens form-based → ES|QL conversion when the date histogram uses
 * `auto` interval: the generated query uses `BUCKET(field, N, ?_tstart, ?_tend)`, and
 * `generate_esql_query.ts` uses the same N with `calculateAuto.near` so the inferred interval matches
 * the bucket width implied by that `BUCKET` call.
 *
 * `N` is 75, not `histogram:barTarget` (default 50), so ES|QL `BUCKET` and the client-side interval
 * match Lens’s form-based `auto` date_histogram; the default 50 would not.
 */
export declare const AUTO_TARGET_NUMBER_OF_BUCKETS = 75;
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
