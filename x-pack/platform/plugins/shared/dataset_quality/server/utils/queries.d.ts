import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare function isUndefinedOrNull(value: any): value is undefined | null;
export declare function wildcardQuery<T extends string>(field: T, value: string | undefined | null): QueryDslQueryContainer[];
export declare function rangeQuery(start?: number, end?: number, field?: string): QueryDslQueryContainer[];
export declare function existsQuery(field: string): QueryDslQueryContainer[];
