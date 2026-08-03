export interface BuildSeriesGroupingValuesQueryOptions {
    ruleId: string;
    /** Group hashes returned by the summary query. */
    groupHashes: readonly string[];
}
/** Raw ES|QL row: the latest non-empty `data` JSON per `group_hash`. */
export interface SeriesGroupingValuesRow {
    group_hash: string;
    episode_data?: string | null;
}
/**
 * Result map: `{ [group_hash]: { [field]: value | null } }`. Fields with no
 * value are mapped to `null` so the consumer can distinguish "no value" from
 * "field not requested".
 */
export type SeriesGroupingValuesByHash = Record<string, Record<string, string | null>>;
/**
 * Builds an ES|QL query that returns the latest non-empty `data` JSON per
 * `group_hash` for a rule, used to render labels like `host=web-01` next to
 * each gantt series.
 *
 * Deliberately **untimed**: grouping values are invariant per `group_hash`
 * (identical field values always produce the same hash), so any non-empty
 * `data` document for a hash carries the right values. Avoiding a time filter
 * keeps the label populated even for series whose only in-window events are
 * recoveries (which write `data: {}`).
 *
 * Mirrors the episodes-list mechanism (`addEpisodeAggregation` in
 * `episodes_query.ts`): read the flattened `data` via `_source` + `JSON_EXTRACT`
 * and parse it client-side, rather than a `terms` agg on `data.<field>` which is
 * brittle against flattened sub-fields whose leaf key contains a dot.
 */
export declare const buildSeriesGroupingValuesEsqlQuery: ({ ruleId, groupHashes, }: BuildSeriesGroupingValuesQueryOptions) => import("@elastic/esql").ComposerQuery;
/**
 * Parses ES|QL rows into a per-hash map of grouping field values. Each row's
 * `episode_data` JSON is parsed once, then projected onto `groupingFields`.
 * Missing/empty values map to `null`.
 *
 * TODO(https://github.com/elastic/kibana/issues/272899): `groupingFields` is the
 * rule's current grouping config, so labels for historical series can drift if the
 * config changed. Resolve per-event field names via rule versioning when available.
 */
export declare const parseSeriesGroupingValuesRows: (rows: readonly SeriesGroupingValuesRow[], groupingFields: readonly string[]) => SeriesGroupingValuesByHash;
