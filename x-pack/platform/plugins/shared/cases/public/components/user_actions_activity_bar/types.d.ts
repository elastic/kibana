export type UserActivityFilter = 'all' | 'user' | 'action';
export type UserActivitySortOrder = 'asc' | 'desc';
export interface UserActivityParams {
    type: UserActivityFilter;
    sortOrder: UserActivitySortOrder;
    page: number;
    perPage: number;
    search?: string;
    authors?: string[];
}
/**
 * Subset of {@link UserActivityParams} persisted to local storage so a user's
 * filter selection is restored across page reloads. The free-text `search`
 * term is intentionally excluded.
 */
export interface UserActivityFilters {
    type: UserActivityFilter;
    sortOrder: UserActivitySortOrder;
    authors?: string[];
}
