import type { estypes } from '@elastic/elasticsearch';
import type { FindOptions } from '../../common/types';
import type { ResolvedExtendedFieldFilter, ResolvedFieldLabelFilter } from './extended_field_search_utils';
export declare const DEFAULT_CASE_SEARCH_FIELDS: string[];
export declare const DEFAULT_CASE_NESTED_FIELDS: string[];
export declare const DEFAULT_CASE_RUNTIME_FIELDS: string[];
export declare const DEFAULT_ATTACHMENT_SEARCH_FIELDS: string[];
export declare const mergeSearchQuery: (searchQuery?: estypes.QueryDslQueryContainer, filterQuery?: estypes.QueryDslQueryContainer) => estypes.QueryDslQueryContainer;
/**
 * Constructs a search query for cases.
 * When search is provided, it will be used to search for cases in
 *** Default search fields.
 *** Nested fields.
 *** Case IDs.
 * When caseIds is provided, it will be used to filter cases by case IDs.
 */
export declare const constructSearchQuery: ({ search, searchFields, caseIds, extendedFieldFilters, fieldLabelFilters, }: {
    search?: string;
    searchFields?: string[];
    caseIds: string[];
    extendedFieldFilters?: ResolvedExtendedFieldFilter[][];
    fieldLabelFilters?: ResolvedFieldLabelFilter[];
}) => estypes.QueryDslQueryContainer | undefined;
export declare const convertFindQueryParams: (findOptions: FindOptions) => Omit<estypes.SearchRequest, "index" | "type" | "query" | "namespaces">;
