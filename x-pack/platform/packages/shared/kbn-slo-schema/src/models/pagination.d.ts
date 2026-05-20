export interface Paginated<T> {
    total: number;
    page: number;
    perPage: number;
    results: T[];
}
export interface Pagination {
    page: number;
    perPage: number;
}
