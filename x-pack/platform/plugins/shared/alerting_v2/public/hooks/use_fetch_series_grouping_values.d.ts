import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { type SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';
export interface UseFetchSeriesGroupingValuesOptions {
    ruleId: string | undefined;
    /** Group hashes returned by the summary query. */
    groupHashes: readonly string[];
    /**
     * Field names from the rule's `grouping.fields`. Used to gate the request and
     * to project the grouping values rendered next to each series.
     */
    groupingFields: readonly string[];
    /** Set false to defer the request (e.g. while the summary query is still loading). */
    enabled?: boolean;
    data: DataPublicPluginStart;
}
/**
 * Fetches the projected grouping field values per `group_hash` for a rule, used
 * to render row labels like `host=web-01` next to each gantt series.
 *
 * The lookup is untimed (grouping values are invariant per hash) and reads the
 * flattened `data` via ES|QL `_source` + `JSON_EXTRACT`, mirroring the episodes
 * list. No request is issued when there are no grouping fields configured or no
 * group hashes to look up — both result in an empty map.
 */
export declare const useFetchSeriesGroupingValues: ({ ruleId, groupHashes, groupingFields, enabled, data, }: UseFetchSeriesGroupingValuesOptions) => {
    data: SeriesGroupingValuesByHash;
    isLoading: boolean;
    isError: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<SeriesGroupingValuesByHash, unknown>>;
};
