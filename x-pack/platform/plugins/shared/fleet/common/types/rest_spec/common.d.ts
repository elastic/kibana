import type { HttpFetchQuery } from '@kbn/core/public';
export interface ListWithKuery extends HttpFetchQuery {
    page?: number;
    perPage?: number;
    sortField?: string;
    sortOrder?: 'desc' | 'asc';
    kuery?: string;
    fields?: string[];
}
export interface ListResult<T> {
    items: T[];
    total: number;
    page: number;
    perPage: number;
}
export interface BulkGetResult<T> {
    items: T[];
}
