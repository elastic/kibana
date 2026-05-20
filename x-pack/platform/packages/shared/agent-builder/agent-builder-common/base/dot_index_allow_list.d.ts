/**
 * Curated allow-list of dot-prefixed index / alias / data-stream patterns that
 * Agent Builder is willing to expose to end users and to the LLM index selection
 * flow.
 *
 * This is an INTENTIONAL allow-list. Adding a pattern here makes the matching
 * resources visible to LLM tool selection and to the UI index picker in the
 * `index_search` tool. Review additions carefully — consider whether:
 *   - The data is meant to be queried by end users (not internal plumbing).
 *   - Access is already authorized via Elasticsearch index privileges; we do
 *     not re-check Kibana feature access here.
 *   - The pattern is narrow enough that it won't accidentally match unrelated
 *     future dot-prefixed resources.
 *
 * Patterns use a simplified glob syntax: `*` matches any sequence of characters
 * (including `.`), everything else is literal. See {@link isVisibleSearchSource}.
 */
export declare const DOT_INDEX_ALLOW_LIST_PATTERNS: readonly string[];
export declare const isVisibleSearchSource: (name: string) => boolean;
