import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchResponse } from '@kbn/es-types';
/**
 * Shape of a single pass-1 row after `CATEGORIZE` + `TOP(_index:_id, 1)`. The
 * categorization step keeps only category metadata plus one representative
 * composite key per pattern — never the full document, because per-field ES|QL
 * aggregations cannot return a coherent `_source` from a grouped row.
 */
export interface Pass1Row {
    docKey: string;
    count: number;
    pattern: string;
}
/**
 * Converts a possibly-dotted ECS field path (e.g. `body.text`) into the
 * ES|QL Composer column-path shape (`['body', 'text']`), or returns the literal
 * field name when there is no dot. Required because `esql.col(...)` accepts a
 * column-segment array for nested paths.
 */
export declare function columnPath(field: string): string | string[];
/**
 * Builds the pass-1 ES|QL categorization query: emit a composite `_index:_id`
 * key per document, optionally apply a KQL filter, optionally SAMPLE for
 * cost-bounded categorization on large populations, then `STATS … BY pattern =
 * CATEGORIZE(field)` and return the top `limit` patterns by count along with
 * one representative key per pattern.
 *
 * Both callers — diverse sampling and SigEvents log-patterns — use the same
 * shape; only `kql` and the `limit` value differ. `TOP(doc_key, 1, "desc")`
 * gives "any stable representative" (not "latest"); pass 2 fetches the
 * `_source` for those keys via `buildPass2Query`.
 */
export declare function buildPass1Query({ indices, field, limit, samplingProbability, kql, }: {
    indices: string[];
    field: string;
    limit: number;
    samplingProbability: number;
    kql?: string;
}): string;
/**
 * Fetches `_source` for the exact composite (`_index:_id`) keys chosen by pass
 * 1. Used by both the diverse-sampling and SigEvents log-patterns helpers.
 *
 * Why not reuse `getSampleDocumentsEsql` for this fetch: that helper discards
 * `_index` when parsing hits (it hardcodes `_index: ''`), so a multi-index
 * `_id` collision becomes indistinguishable. Streams queries routinely span
 * backing indices, so the composite key is load-bearing.
 */
export declare function buildPass2Query(indices: string[], docKeys: string[]): string;
/**
 * Parses a pass-1 ES|QL response into rows tagged with the representative
 * composite key, pattern, and count. Tolerates a known ES response-shape
 * variance: `TOP(..., 1)` is normally a scalar but some snapshots wrap it in a
 * single-item array.
 */
export declare function parsePass1Rows(response: ESQLSearchResponse): Pass1Row[];
/**
 * Parses a pass-2 ES|QL response into Elasticsearch `SearchHit` shapes. Reads
 * `_index`, `_id`, and `_source` columns by name (column position can drift
 * across ES snapshots when `drop_null_columns` is in play).
 */
export declare function parsePass2Hits(response: ESQLSearchResponse): Array<SearchHit<Record<string, unknown>>>;
