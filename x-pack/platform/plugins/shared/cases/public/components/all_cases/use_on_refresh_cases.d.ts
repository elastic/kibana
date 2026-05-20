/**
 * Using react-query queryClient to invalidate all the
 * cases table page cache namespace.
 *
 * This effectively clears the cache for all the cases table pages and
 * forces the page to fetch all the data again. Including
 * all cases, user profiles, statuses, metrics, tags, etc.
 */
export declare const useRefreshCases: () => () => void;
