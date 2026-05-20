export declare const PAGE_SIZE_OPTIONS: readonly number[];
export interface Pagination {
    currentPage: number;
    pageSize: number;
}
export declare function usePagination(pageInfo?: Pagination): {
    pagination: Pagination;
    setPagination: import("react").Dispatch<import("react").SetStateAction<Pagination>>;
    pageSizeOptions: number[];
};
