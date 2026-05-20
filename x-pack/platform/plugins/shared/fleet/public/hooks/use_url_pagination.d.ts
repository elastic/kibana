import type { Pagination } from './use_pagination';
type SetUrlPagination = (pagination: Pagination) => void;
export interface UrlPagination {
    pagination: Pagination;
    setPagination: SetUrlPagination;
    pageSizeOptions: number[];
}
/**
 * Uses URL params for pagination and also persists those to the URL as they are updated
 */
export declare const useUrlPagination: () => UrlPagination;
export {};
