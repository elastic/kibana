import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
/**
 * Gets the cardinality of the selected split field
 * @param splitField
 * @param query
 */
export declare function useSplitFieldCardinality(splitField: string | undefined, query: QueryDslQueryContainer): number | null;
