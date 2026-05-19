export type UserActivityFilter = 'all' | 'user' | 'action';
export type UserActivitySortOrder = 'asc' | 'desc';
export interface UserActivityParams {
    type: UserActivityFilter;
    sortOrder: UserActivitySortOrder;
    page: number;
    perPage: number;
}
