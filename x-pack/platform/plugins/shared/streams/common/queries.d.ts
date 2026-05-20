import type { QueryLink } from '@kbn/streams-schema';
export type { QueryLink };
export declare const QUERY_STATUSES: readonly ["active", "draft"];
export type QueryStatus = (typeof QUERY_STATUSES)[number];
export declare const SEARCH_MODES: readonly ["keyword", "semantic", "hybrid"];
export type SearchMode = (typeof SEARCH_MODES)[number];
export declare function resolveSearchMode(searchMode?: SearchMode): SearchMode;
export type QueryLinkRequest = Omit<QueryLink, 'asset.uuid' | 'stream_name'>;
export type QueryUnlinkRequest = Pick<QueryLink, 'asset.type' | 'asset.id'>;
export type Query = QueryLink & {
    title: string;
};
