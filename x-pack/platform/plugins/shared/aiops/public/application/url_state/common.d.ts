import type { estypes } from '@elastic/elasticsearch';
import type { Filter, Query } from '@kbn/es-query';
import { type SearchQueryLanguage } from '@kbn/ml-query-utils';
declare const defaultSearchQuery: {
    readonly match_all: {};
};
export declare const isDefaultSearchQuery: (arg: unknown) => arg is typeof defaultSearchQuery;
export interface AiOpsPageUrlState {
    pageKey: 'AIOPS_INDEX_VIEWER';
    pageUrlState: AiOpsIndexBasedAppState;
}
export interface AiOpsIndexBasedAppState {
    searchString?: Query['query'];
    searchQuery?: estypes.QueryDslQueryContainer;
    searchQueryLanguage: SearchQueryLanguage;
    filters?: Filter[];
}
export type AiOpsFullIndexBasedAppState = Required<AiOpsIndexBasedAppState>;
export declare const getDefaultAiOpsListState: (overrides?: Partial<AiOpsIndexBasedAppState>) => AiOpsFullIndexBasedAppState;
export {};
