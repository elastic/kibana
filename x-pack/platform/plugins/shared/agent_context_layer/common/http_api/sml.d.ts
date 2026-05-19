/**
 * Allowed type keys for the `filters` parameter in SML search.
 * Extend this enum when adding new filterable SML types.
 */
export declare enum SmlSearchFilterType {
    connector = "connector"
}
/**
 * Per-type filter criteria for SML search.
 * Keys must be values of {@link SmlSearchFilterType}.
 */
export type SmlSearchFilters = Partial<Record<SmlSearchFilterType, {
    ids?: string[];
}>>;
/**
 * Max length of `query` for POST `/internal/agent_context_layer/sml/_search`.
 */
export declare const SML_HTTP_SEARCH_QUERY_MAX_LENGTH = 512;
/**
 * Response body for `POST /internal/agent_context_layer/sml/_search`.
 */
export interface SmlSearchHttpResponse {
    total: number;
    results: SmlSearchHttpResultItem[];
}
export interface SmlSearchHttpResultItem {
    id: string;
    type: string;
    origin_id: string;
    title: string;
    score: number;
    content?: string;
}
