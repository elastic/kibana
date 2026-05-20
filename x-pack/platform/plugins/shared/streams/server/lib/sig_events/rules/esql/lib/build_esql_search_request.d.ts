import type { estypes } from '@elastic/elasticsearch';
/**
 * Builds the ES|QL search request for match-type rule execution.
 *
 * IMPORTANT: Results are hard-capped at {@link MAX_ALERTS_PER_EXECUTION}
 * (currently 1 000). During large incidents this means additional matching
 * documents in the same lookback window are silently dropped. If under-
 * reporting during spikes becomes a problem, consider paging, raising the
 * cap with explicit cost bounds, or aggregating high-cardinality bursts.
 */
export declare const buildEsqlSearchRequest: ({ query, timestampField, from, to, previousOriginalDocumentIds, }: {
    query: string;
    timestampField: string;
    from: string;
    to: string;
    previousOriginalDocumentIds: string[];
}) => {
    query: string;
    filter: estypes.QueryDslQueryContainer;
};
