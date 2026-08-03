import type { UserActivityParams } from './types';
/**
 * Whether any of the type/author/search filters are applied. Derived from
 * the applied `params`, not in-progress UI input.
 */
export declare const hasActiveUserActivityFilter: (params: UserActivityParams) => boolean;
/**
 * Whether `search` and/or `authors` are applied (deliberately excludes
 * `type`). Used by `useLastPage` and `useInfiniteFindCaseUserActions` to
 * decide if `userActionsStats` (unfiltered totals) can compute a separate
 * last page. Both call sites must agree, or pagination will disagree on
 * where results end.
 */
export declare const hasSearchOrAuthorFilter: (params: Pick<UserActivityParams, "search" | "authors">) => boolean;
